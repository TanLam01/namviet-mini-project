package domain

import (
	"context"
	"time"
)

type User struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Username  string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"username"`
	Password  string    `gorm:"type:varchar(255);not null" json:"-"` // never return password in JSON
	Role      string    `gorm:"type:varchar(20);not null;default:'user'" json:"role"` // admin, user
	Email     string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
	FullName  string    `gorm:"type:varchar(100);not null" json:"fullName"`
	Phone     string    `gorm:"type:varchar(20)" json:"phone"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type UserRepository interface {
	CreateUser(ctx context.Context, user *User) error
	GetUserByUsername(ctx context.Context, username string) (*User, error)
	SeedDefaultUsers() error
}

type UserUseCase interface {
	RegisterUser(ctx context.Context, username string, password string, email string, fullName string, phone string) error
	Login(ctx context.Context, username string, password string) (*User, error)
	SeedDefaultUsers() error
}
