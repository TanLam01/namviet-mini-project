package sse

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
)

type SSEBroker struct {
	clients    map[chan string]bool
	newClients chan chan string
	defClients chan chan string
	message    chan string
	mu         sync.Mutex
}

var Broker *SSEBroker

func InitSSE() {
	Broker = &SSEBroker{
		clients:    make(map[chan string]bool),
		newClients: make(chan chan string),
		defClients: make(chan chan string),
		message:    make(chan string),
	}
	go Broker.listen()
}

func (b *SSEBroker) listen() {
	for {
		select {
		case s := <-b.newClients:
			b.mu.Lock()
			b.clients[s] = true
			b.mu.Unlock()
			log.Println("Added new SSE client")

		case s := <-b.defClients:
			b.mu.Lock()
			delete(b.clients, s)
			close(s)
			b.mu.Unlock()
			log.Println("Removed SSE client")

		case msg := <-b.message:
			b.mu.Lock()
			for s := range b.clients {
				select {
				case s <- msg:
				default:
					log.Println("Client channel full, skipping message")
				}
			}
			b.mu.Unlock()
		}
	}
}

func (b *SSEBroker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	messageChan := make(chan string, 10)
	b.newClients <- messageChan

	defer func() {
		b.defClients <- messageChan
	}()

	notify := r.Context().Done()

	// Initial message to client
	fmt.Fprintf(w, "data: {\"status\":\"connected\"}\n\n")
	flusher.Flush()

	for {
		select {
		case <-notify:
			return
		case msg := <-messageChan:
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		}
	}
}

// BroadcastUpdate triggers SSE message to notify clients to refresh
func BroadcastUpdate(action string, ticketId string) {
	data := map[string]string{
		"action":   action,   // e.g., "held", "released", "sold"
		"ticketId": ticketId, // e.g., "VIP-001"
	}
	bytes, err := json.Marshal(data)
	if err == nil {
		Broker.message <- string(bytes)
	}
}
