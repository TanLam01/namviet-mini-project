package domain

import "time"

type ErrorLog struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       *uint     `gorm:"index" json:"userId"` // pointer to support NULL in database for guest users
	Email        string    `gorm:"type:varchar(100)" json:"email"`
	IPAddress    string    `gorm:"type:varchar(45)" json:"ipAddress"`
	Method       string    `gorm:"type:varchar(10)" json:"method"`
	Path         string    `gorm:"type:text" json:"path"`
	QueryParams  string    `gorm:"type:text" json:"queryParams"`
	RequestBody  string    `gorm:"type:text" json:"requestBody"`
	ErrorMessage string    `gorm:"type:text" json:"errorMessage"`
	StatusCode   int       `json:"statusCode"`
	UserAgent    string    `gorm:"type:text" json:"userAgent"`
	CreatedAt    time.Time `json:"createdAt"`
}
