package usecase

import (
	"sync"
	"testing"
	"time"

	"backend/domain"
)

func TestTicketModelInitialization(t *testing.T) {
	expiry := time.Now().Add(5 * time.Minute)
	ticket := domain.Ticket{
		ID:         "VIP-999",
		Type:       "VIP",
		Price:      2500000,
		Status:     "Holding",
		HoldExpiry: &expiry,
	}

	if ticket.ID != "VIP-999" {
		t.Errorf("Expected ticket ID to be VIP-999, got %s", ticket.ID)
	}

	if ticket.Status != "Holding" {
		t.Errorf("Expected ticket status to be Holding, got %s", ticket.Status)
	}
}

// TestConcurrencySimulation simulates concurrent requests attempting to hold a single resource
func TestConcurrencySimulation(t *testing.T) {
	var mu sync.Mutex
	status := "Available"
	successCount := 0
	failureCount := 0

	var wg sync.WaitGroup
	concurrentRequests := 50

	for i := 0; i < concurrentRequests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			
			mu.Lock()
			defer mu.Unlock()

			if status == "Available" {
				time.Sleep(10 * time.Millisecond)
				status = "Holding"
				successCount++
			} else {
				failureCount++
			}
		}()
	}

	wg.Wait()

	if successCount != 1 {
		t.Errorf("Concurrency violation! Expected exactly 1 successful hold, got %d", successCount)
	}

	if failureCount != concurrentRequests-1 {
		t.Errorf("Expected %d failed requests, got %d", concurrentRequests-1, failureCount)
	}
}
