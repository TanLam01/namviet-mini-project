package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"

	"backend/domain"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// AuthMiddleware extracts session cookie, checks Redis, and injects user context
func AuthMiddleware(rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID, err := c.Cookie("ticketbox_session")
		if err != nil || sessionID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Yêu cầu đăng nhập để thực hiện thao tác này!"})
			c.Abort()
			return
		}

		sessionKey := fmt.Sprintf("session:%s", sessionID)
		userJSON, err := rdb.Get(c.Request.Context(), sessionKey).Result()
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Phiên làm việc đã hết hạn hoặc không hợp lệ!"})
			c.Abort()
			return
		}

		var user domain.User
		if err := json.Unmarshal([]byte(userJSON), &user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi dữ liệu phiên!"})
			c.Abort()
			return
		}

		c.Set("currentUser", &user)
		c.Next()
	}
}

// AdminMiddleware checks if the current user has the admin role
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userVal, exists := c.Get("currentUser")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Yêu cầu đăng nhập!"})
			c.Abort()
			return
		}

		user, ok := userVal.(*domain.User)
		if !ok || user.Role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Yêu cầu quyền Quản trị viên (Admin) để thực hiện thao tác này!"})
			c.Abort()
			return
		}
		c.Next()
	}
}
