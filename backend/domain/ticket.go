package domain

import (
	"context"
	"time"
)

type Ticket struct {
	ID            string     `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Type          string     `gorm:"type:varchar(50);not null" json:"type"`
	Price         int64      `gorm:"not null" json:"price"`
	Status        string     `gorm:"type:varchar(20);not null;default:'Available'" json:"status"` // Available, Holding, Sold
	HoldExpiry    *time.Time `json:"holdExpiry"`
	HeldBy        *string    `gorm:"type:varchar(255)" json:"heldBy"`
	CustomerName  *string    `gorm:"type:varchar(255)" json:"customerName"`
	CustomerEmail *string    `gorm:"type:varchar(255)" json:"customerEmail"`
	CustomerPhone *string    `gorm:"type:varchar(255)" json:"customerPhone"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

type Stats struct {
	Sold               int64 `json:"sold"`
	Holding            int64 `json:"holding"`
	Available          int64 `json:"available"`
	Revenue            int64 `json:"revenue"`
	VipAvailable       int64 `json:"vipAvailable"`
	GaAvailable        int64 `json:"gaAvailable"`
	StandardAvailable  int64 `json:"standardAvailable"`
	Total              int64 `json:"total"`
}

// TicketRepository defines database persistence layer contracts (PostgreSQL + Redis)
type TicketRepository interface {
	SeedTickets() error
	GetTickets() ([]Ticket, error)
	GetStats() (Stats, error)
	HoldTickets(ctx context.Context, ticketIds []string, buyerName string, expiryDuration time.Duration) error
	ReleaseTickets(ctx context.Context, ticketIds []string) error
	ConfirmPayment(ctx context.Context, ticketIds []string, fullName string, email string, phone string) error
	ResetAllTickets() error
	CleanupExpiredHolds() error
}

// TicketUseCase defines application use case contracts
type TicketUseCase interface {
	SeedTickets() error
	GetTickets() ([]Ticket, error)
	GetStats() (Stats, error)
	HoldTickets(ctx context.Context, ticketIds []string, buyerName string) error
	ReleaseTickets(ctx context.Context, ticketIds []string) error
	ConfirmPayment(ctx context.Context, ticketIds []string, fullName string, email string, phone string) error
	ResetAllTickets() error
	StartCleanupWorker(interval time.Duration)
}
