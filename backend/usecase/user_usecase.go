package usecase

import (
	"context"
	"errors"

	"backend/domain"
	"golang.org/x/crypto/bcrypt"
)

type userUseCase struct {
	repo domain.UserRepository
}

// NewUserUseCase instantiates UserUseCase
func NewUserUseCase(repo domain.UserRepository) domain.UserUseCase {
	return &userUseCase{
		repo: repo,
	}
}

func (u *userUseCase) RegisterUser(ctx context.Context, username string, password string, email string, fullName string, phone string) error {
	// 1. Check if user already exists
	existing, err := u.repo.GetUserByUsername(ctx, username)
	if err != nil {
		return err
	}
	if existing != nil {
		return errors.New("tên đăng nhập đã tồn tại, vui lòng chọn tên khác")
	}

	// 2. Hash password using bcrypt
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	newUser := &domain.User{
		Username: username,
		Password: string(hash),
		Role:     "user", // default registration is always "user"
		Email:    email,
		FullName: fullName,
		Phone:    phone,
	}

	return u.repo.CreateUser(ctx, newUser)
}

func (u *userUseCase) Login(ctx context.Context, username string, password string) (*domain.User, error) {
	// 1. Fetch user by username
	user, err := u.repo.GetUserByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("tên đăng nhập hoặc mật khẩu không chính xác")
	}

	// 2. Compare bcrypt hash
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return nil, errors.New("tên đăng nhập hoặc mật khẩu không chính xác")
	}

	return user, nil
}

func (u *userUseCase) SeedDefaultUsers() error {
	return u.repo.SeedDefaultUsers()
}
