package repository

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sort"
	"time"

	"backend/delivery/sse"
	"backend/domain"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type postgresTicketRepository struct {
	db    *gorm.DB
	redis *redis.Client
}

// NewPostgresTicketRepository instantiates PostgreSQL + Redis implementation of TicketRepository
func NewPostgresTicketRepository(db *gorm.DB, rdb *redis.Client) domain.TicketRepository {
	return &postgresTicketRepository{
		db:    db,
		redis: rdb,
	}
}

func (r *postgresTicketRepository) SeedTickets() error {
	var count int64
	r.db.Model(&domain.Ticket{}).Count(&count)
	if count > 0 {
		return nil
	}

	log.Println("Seeding 500 tickets in concert database...")
	
	tickets := make([]domain.Ticket, 0, 500)

	// VIP Tickets: 50 seats (Price: 3,000,000 VND)
	for i := 1; i <= 50; i++ {
		tickets = append(tickets, domain.Ticket{
			ID:     fmt.Sprintf("VIP-%03d", i),
			Type:   "VIP",
			Price:  3000000,
			Status: "Available",
		})
	}

	// GA Tickets: 150 seats (Price: 1,500,000 VND)
	for i := 1; i <= 150; i++ {
		tickets = append(tickets, domain.Ticket{
			ID:     fmt.Sprintf("GA-%03d", i),
			Type:   "GA",
			Price:  1500000,
			Status: "Available",
		})
	}

	// Standard Tickets: 300 seats (Price: 800,000 VND)
	for i := 1; i <= 300; i++ {
		tickets = append(tickets, domain.Ticket{
			ID:     fmt.Sprintf("STD-%03d", i),
			Type:   "STANDARD",
			Price:  800000,
			Status: "Available",
		})
	}

	// Batch insert for performance
	err := r.db.CreateInBatches(tickets, 100).Error
	if err != nil {
		return err
	}

	log.Println("Seeding tickets completed successfully.")
	return nil
}

func (r *postgresTicketRepository) GetTickets() ([]domain.Ticket, error) {
	var tickets []domain.Ticket
	// Sort by ID to keep the seat grid consistent
	err := r.db.Order("id ASC").Find(&tickets).Error
	return tickets, err
}

func (r *postgresTicketRepository) GetStats() (domain.Stats, error) {
	var stats domain.Stats

	type RawStats struct {
		Total             int64 `gorm:"column:total"`
		Sold              int64 `gorm:"column:sold"`
		Holding           int64 `gorm:"column:holding"`
		Available         int64 `gorm:"column:available"`
		VipAvailable      int64 `gorm:"column:vip_available"`
		GaAvailable       int64 `gorm:"column:ga_available"`
		StandardAvailable int64 `gorm:"column:standard_available"`
		Revenue           int64 `gorm:"column:revenue"`
	}

	var raw RawStats
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(CASE WHEN status = 'Sold' THEN 1 END) as sold,
			COUNT(CASE WHEN status = 'Holding' THEN 1 END) as holding,
			COUNT(CASE WHEN status = 'Available' THEN 1 END) as available,
			COUNT(CASE WHEN type = 'VIP' AND status = 'Available' THEN 1 END) as vip_available,
			COUNT(CASE WHEN type = 'GA' AND status = 'Available' THEN 1 END) as ga_available,
			COUNT(CASE WHEN type = 'STANDARD' AND status = 'Available' THEN 1 END) as standard_available,
			COALESCE(SUM(CASE WHEN status = 'Sold' THEN price END), 0) as revenue
		FROM tickets
	`

	if err := r.db.Raw(query).Scan(&raw).Error; err != nil {
		return stats, err
	}

	stats.Total = raw.Total
	stats.Sold = raw.Sold
	stats.Holding = raw.Holding
	stats.Available = raw.Available
	stats.VipAvailable = raw.VipAvailable
	stats.GaAvailable = raw.GaAvailable
	stats.StandardAvailable = raw.StandardAvailable
	stats.Revenue = raw.Revenue

	return stats, nil
}

func (r *postgresTicketRepository) HoldTickets(ctx context.Context, ticketIds []string, buyerName string, expiryDuration time.Duration) error {
	if len(ticketIds) == 0 {
		return errors.New("danh sách vé trống")
	}

	// Sắp xếp các ID vé để chống deadlock khi nhiều giao dịch chạy đồng thời!
	sort.Strings(ticketIds)

	// 1. Thử khóa các phím mutex tạm thời trong Redis
	var lockedKeys []string
	defer func() {
		for _, key := range lockedKeys {
			r.redis.Del(ctx, key)
		}
	}()

	for _, ticketId := range ticketIds {
		lockKey := fmt.Sprintf("lock:ticket:%s", ticketId)
		locked := false
		for i := 0; i < 5; i++ {
			success, err := r.redis.SetNX(ctx, lockKey, "locked", 3*time.Second).Result()
			if err == nil && success {
				locked = true
				break
			}
			time.Sleep(50 * time.Millisecond)
		}
		if !locked {
			return fmt.Errorf("ghế %s đang được xử lý bởi người khác, vui lòng thử lại sau", ticketId)
		}
		lockedKeys = append(lockedKeys, lockKey)
	}

	// 2. Chạy PostgreSQL Transaction (SELECT FOR UPDATE)
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var dbTickets []domain.Ticket
		if err := tx.Raw("SELECT * FROM tickets WHERE id IN ? FOR UPDATE", ticketIds).Scan(&dbTickets).Error; err != nil {
			return err
		}

		if len(dbTickets) != len(ticketIds) {
			return errors.New("một hoặc nhiều vé không tồn tại")
		}

		for _, ticket := range dbTickets {
			if ticket.Status != "Available" {
				return fmt.Errorf("ghế %s đã được mua hoặc đang bị giữ bởi người khác", ticket.ID)
			}
		}

		expiryTime := time.Now().UTC().Add(expiryDuration)
		for _, ticket := range dbTickets {
			ticket.Status = "Holding"
			ticket.HoldExpiry = &expiryTime
			ticket.HeldBy = &buyerName

			if err := tx.Save(&ticket).Error; err != nil {
				return err
			}

			// Lưu session giữ vé lâu dài (5 phút) trên Redis
			holdKey := fmt.Sprintf("ticket:hold:%s", ticket.ID)
			if err := r.redis.Set(ctx, holdKey, buyerName, expiryDuration).Err(); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return err
	}

	// Phát tín hiệu SSE real-time báo giữ vé
	for _, ticketId := range ticketIds {
		go sse.BroadcastUpdate("held", ticketId)
	}

	return nil
}

func (r *postgresTicketRepository) ReleaseTickets(ctx context.Context, ticketIds []string) error {
	if len(ticketIds) == 0 {
		return nil
	}

	sort.Strings(ticketIds)

	err := r.db.Transaction(func(tx *gorm.DB) error {
		var dbTickets []domain.Ticket
		if err := tx.Raw("SELECT * FROM tickets WHERE id IN ? FOR UPDATE", ticketIds).Scan(&dbTickets).Error; err != nil {
			return err
		}

		var idsToRelease []string
		for _, ticket := range dbTickets {
			if ticket.Status == "Holding" {
				idsToRelease = append(idsToRelease, ticket.ID)
			}
		}

		if len(idsToRelease) == 0 {
			return nil
		}

		// 1. Batch update status to Available in database
		if err := tx.Model(&domain.Ticket{}).Where("id IN ?", idsToRelease).Updates(map[string]interface{}{
			"status":      "Available",
			"hold_expiry": nil,
			"held_by":     nil,
		}).Error; err != nil {
			return err
		}

		// 2. Batch delete Redis hold keys using pipeline
		pipe := r.redis.Pipeline()
		for _, id := range idsToRelease {
			holdKey := fmt.Sprintf("ticket:hold:%s", id)
			pipe.Del(ctx, holdKey)
		}
		if _, err := pipe.Exec(ctx); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return err
	}

	// Phát tín hiệu SSE báo nhả vé
	for _, ticketId := range ticketIds {
		go sse.BroadcastUpdate("released", ticketId)
	}

	return nil
}

func (r *postgresTicketRepository) ConfirmPayment(ctx context.Context, ticketIds []string, fullName string, email string, phone string) error {
	if len(ticketIds) == 0 {
		return errors.New("danh sách vé trống")
	}

	sort.Strings(ticketIds)

	err := r.db.Transaction(func(tx *gorm.DB) error {
		var dbTickets []domain.Ticket
		if err := tx.Raw("SELECT * FROM tickets WHERE id IN ? FOR UPDATE", ticketIds).Scan(&dbTickets).Error; err != nil {
			return err
		}

		if len(dbTickets) != len(ticketIds) {
			return errors.New("một hoặc nhiều vé không tồn tại hoặc đã hết hạn giữ")
		}

		for _, ticket := range dbTickets {
			if ticket.Status != "Holding" {
				return fmt.Errorf("phiên giữ vé %s đã hết hạn hoặc không tồn tại", ticket.ID)
			}
		}

		for _, ticket := range dbTickets {
			ticket.Status = "Sold"
			ticket.HoldExpiry = nil
			ticket.HeldBy = &fullName
			ticket.CustomerName = &fullName
			ticket.CustomerEmail = &email
			ticket.CustomerPhone = &phone

			if err := tx.Save(&ticket).Error; err != nil {
				return err
			}

			// Xóa session giữ vé trên Redis
			holdKey := fmt.Sprintf("ticket:hold:%s", ticket.ID)
			r.redis.Del(ctx, holdKey)
		}

		return nil
	})

	if err != nil {
		return err
	}

	// Phát tín hiệu SSE báo đã bán
	for _, ticketId := range ticketIds {
		go sse.BroadcastUpdate("sold", ticketId)
	}

	return nil
}

func (r *postgresTicketRepository) ResetAllTickets() error {
	// 1. Delete all transactions/tickets
	if err := r.db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&domain.Ticket{}).Error; err != nil {
		return err
	}

	// 2. Clear all Redis hold session keys
	ctx := context.Background()
	iter := r.redis.Scan(ctx, 0, "ticket:hold:*", 0).Iterator()
	for iter.Next(ctx) {
		r.redis.Del(ctx, iter.Val())
	}

	return r.SeedTickets()
}

func (r *postgresTicketRepository) CleanupExpiredHolds() error {
	var expiredTickets []domain.Ticket
	now := time.Now().UTC()

	err := r.db.Where("status = ? AND hold_expiry <= ?", "Holding", now).Find(&expiredTickets).Error
	if err != nil {
		return err
	}

	if len(expiredTickets) == 0 {
		return nil
	}

	var ticketIds []string
	for _, t := range expiredTickets {
		log.Printf("Cleanup expired ticket %s...", t.ID)
		ticketIds = append(ticketIds, t.ID)
	}

	return r.ReleaseTickets(context.Background(), ticketIds)
}
