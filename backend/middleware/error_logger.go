package middleware

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	"backend/domain"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w bodyLogWriter) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

func ErrorLoggingMiddleware(db *gorm.DB) gin.HandlerFunc {
	// Create logs folder if it does not exist
	logDir := "./logs"
	if err := os.MkdirAll(logDir, os.ModePerm); err != nil {
		log.Printf("[ErrorLogger] Failed to create log directory: %v", err)
	}

	// Open or create the error log file
	logFilePath := filepath.Join(logDir, "error.log")
	logFile, err := os.OpenFile(logFilePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	if err != nil {
		log.Printf("[ErrorLogger] Failed to open error log file: %v", err)
	}

	return func(c *gin.Context) {
		// Read the request body to log it later if an error occurs
		var reqBodyBytes []byte
		if c.Request.Body != nil {
			reqBodyBytes, _ = io.ReadAll(c.Request.Body)
			// Restore request body so other handlers can read it
			c.Request.Body = io.NopCloser(bytes.NewBuffer(reqBodyBytes))
		}

		// Wrap response writer to capture the response body
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		// Process request
		c.Next()

		statusCode := c.Writer.Status()
		if statusCode >= 400 {
			// Extract user info if authenticated
			var userID *uint
			var email string
			if userVal, exists := c.Get("currentUser"); exists {
				if user, ok := userVal.(*domain.User); ok {
					userID = &user.ID
					email = user.Email
				}
			}
			if email == "" {
				email = "Guest"
			}

			// Get error message from response body or Gin errors
			errMessage := blw.body.String()
			if len(c.Errors) > 0 {
				errMessage = c.Errors.String()
			}

			// Create the error log entry
			errorLog := domain.ErrorLog{
				UserID:       userID,
				Email:        email,
				IPAddress:    c.ClientIP(),
				Method:       c.Request.Method,
				Path:         c.Request.URL.Path,
				QueryParams:  c.Request.URL.RawQuery,
				RequestBody:  string(reqBodyBytes),
				ErrorMessage: errMessage,
				StatusCode:   statusCode,
				UserAgent:    c.Request.UserAgent(),
				CreatedAt:    time.Now(),
			}

			// 1. Write to DB asynchronously so it doesn't block the request lifecycle
			go func(logEntry domain.ErrorLog) {
				if err := db.Create(&logEntry).Error; err != nil {
					log.Printf("[ErrorLogger] Failed to save log to DB: %v", err)
				}
			}(errorLog)

			// 2. Write to log file
			if logFile != nil {
				userIDStr := "nil"
				if errorLog.UserID != nil {
					userIDStr = fmt.Sprintf("%d", *errorLog.UserID)
				}
				logLine := fmt.Sprintf("[%s] %d | %s %s | User: %s (ID: %s) | IP: %s | Error: %s\n",
					errorLog.CreatedAt.Format("2006-01-02 15:04:05"),
					errorLog.StatusCode,
					errorLog.Method,
					errorLog.Path,
					errorLog.Email,
					userIDStr,
					errorLog.IPAddress,
					errorLog.ErrorMessage,
				)
				if _, err := logFile.WriteString(logLine); err != nil {
					log.Printf("[ErrorLogger] Failed to write to log file: %v", err)
				}
			}
		}
	}
}
