package usecase

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestPasswordHashing(t *testing.T) {
	password := "admin123"

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("Failed to generate bcrypt hash: %v", err)
	}

	// Verify hashed password is not clear text
	if string(hashedPassword) == password {
		t.Errorf("Security issue: hashed password matches plain text password")
	}

	// Verify correct match
	err = bcrypt.CompareHashAndPassword(hashedPassword, []byte(password))
	if err != nil {
		t.Errorf("Compare failed for valid password: %v", err)
	}

	// Verify incorrect match fails
	err = bcrypt.CompareHashAndPassword(hashedPassword, []byte("wrong_password"))
	if err == nil {
		t.Errorf("Compare succeeded for invalid password")
	}
}
