package repository

import (
	"context"
	"errors"
	"log"

	"backend/domain"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type postgresUserRepository struct {
	db *gorm.DB
}

// NewPostgresUserRepository instantiates PostgreSQL implementation of UserRepository
func NewPostgresUserRepository(db *gorm.DB) domain.UserRepository {
	return &postgresUserRepository{
		db: db,
	}
}

func (r *postgresUserRepository) CreateUser(ctx context.Context, user *domain.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *postgresUserRepository) GetUserByUsername(ctx context.Context, username string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).Where("username = ?", username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // return nil if user not found (easier check)
		}
		return nil, err
	}
	return &user, nil
}

func (r *postgresUserRepository) SeedDefaultUsers() error {
	var count int64
	r.db.Model(&domain.User{}).Count(&count)
	if count > 0 {
		return nil
	}

	log.Println("Seeding default users (admin and user)...")

	// 1. Seed Admin
	adminHash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	adminUser := domain.User{
		Username: "admin",
		Password: string(adminHash),
		Role:     "admin",
		Email:    "admin@ticketbox.com",
		FullName: "System Administrator",
		Phone:    "0123456789",
	}
	if err := r.db.Create(&adminUser).Error; err != nil {
		return err
	}

	// 2. Seed Mock User
	userHash, err := bcrypt.GenerateFromPassword([]byte("user123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	mockUser := domain.User{
		Username: "user",
		Password: string(userHash),
		Role:     "user",
		Email:    "user@gmail.com",
		FullName: "Khách hàng Thân thiết",
		Phone:    "0901234567",
	}
	if err := r.db.Create(&mockUser).Error; err != nil {
		return err
	}

	log.Println("Successfully seeded default users.")
	return nil
}
