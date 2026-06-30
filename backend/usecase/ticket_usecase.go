package usecase

import (
	"context"
	"log"
	"time"

	"backend/delivery/sse"
	"backend/domain"
)

type ticketUseCase struct {
	repo domain.TicketRepository
}

// NewTicketUseCase instantiates TicketUseCase business rules
func NewTicketUseCase(repo domain.TicketRepository) domain.TicketUseCase {
	return &ticketUseCase{
		repo: repo,
	}
}

func (u *ticketUseCase) SeedTickets() error {
	return u.repo.SeedTickets()
}

func (u *ticketUseCase) GetTickets() ([]domain.Ticket, error) {
	return u.repo.GetTickets()
}

func (u *ticketUseCase) GetStats() (domain.Stats, error) {
	return u.repo.GetStats()
}

func (u *ticketUseCase) HoldTickets(ctx context.Context, ticketIds []string, buyerName string) error {
	return u.repo.HoldTickets(ctx, ticketIds, buyerName, 5*time.Minute)
}

func (u *ticketUseCase) ReleaseTickets(ctx context.Context, ticketIds []string) error {
	return u.repo.ReleaseTickets(ctx, ticketIds)
}

func (u *ticketUseCase) ConfirmPayment(ctx context.Context, ticketIds []string, fullName string, email string, phone string) error {
	return u.repo.ConfirmPayment(ctx, ticketIds, fullName, email, phone)
}

func (u *ticketUseCase) ResetAllTickets() error {
	err := u.repo.ResetAllTickets()
	if err == nil {
		go sse.BroadcastUpdate("reset", "")
	}
	return err
}

func (u *ticketUseCase) StartCleanupWorker(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			err := u.repo.CleanupExpiredHolds()
			if err != nil {
				log.Printf("Worker cleanup error: %v", err)
			}
		}
	}()
}
