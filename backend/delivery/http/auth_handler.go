package http

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"backend/domain"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type AuthHandler struct {
	useCase domain.UserUseCase
	redis   *redis.Client
}

// NewAuthHandler maps auth routes and registers Me / Logout endpoints
func NewAuthHandler(r *gin.RouterGroup, uc domain.UserUseCase, rdb *redis.Client) {
	h := &AuthHandler{
		useCase: uc,
		redis:   rdb,
	}

	r.POST("/auth/login", h.Login)
	r.POST("/auth/register", h.Register)
	r.POST("/auth/logout", h.Logout)
	r.GET("/auth/me", h.Me)
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func generateSessionID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return hex.EncodeToString(b)
}

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

// Login verifies user credentials, starts a Redis session, and sets a HttpOnly cookie
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu gửi lên không đúng định dạng!"})
		return
	}

	user, err := h.useCase.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// 1. Generate session ID
	sessionID := generateSessionID()
	if sessionID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể khởi tạo phiên làm việc!"})
		return
	}

	// 2. Save user session data in Redis with 2-hour TTL
	sessionKey := fmt.Sprintf("session:%s", sessionID)
	userJSON, err := json.Marshal(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi mã hóa dữ liệu phiên!"})
		return
	}

	err = h.redis.Set(c.Request.Context(), sessionKey, userJSON, 2*time.Hour).Err()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu trữ phiên làm việc!"})
		return
	}

	// 3. Set HttpOnly Cookie (MaxAge: 2 hours, Secure: false for local http, SameSite: Lax)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("ticketbox_session", sessionID, 7200, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": gin.H{
			"username": user.Username,
			"role":     user.Role,
			"fullName": user.FullName,
			"email":    user.Email,
			"phone":    user.Phone,
		},
	})
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	Email    string `json:"email" binding:"required,email"`
	FullName string `json:"fullName" binding:"required"`
	Phone    string `json:"phone" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thông tin đăng ký không hợp lệ hoặc mật khẩu quá ngắn (tối thiểu 6 ký tự)!"})
		return
	}

	err := h.useCase.RegisterUser(c.Request.Context(), req.Username, req.Password, req.Email, req.FullName, req.Phone)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Đăng ký tài khoản thành công!"})
}

// Me retrieves user profile based on the active session cookie
func (h *AuthHandler) Me(c *gin.Context) {
	sessionID, err := c.Cookie("ticketbox_session")
	if err != nil || sessionID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Chưa đăng nhập!"})
		return
	}

	sessionKey := fmt.Sprintf("session:%s", sessionID)
	userJSON, err := h.redis.Get(c.Request.Context(), sessionKey).Result()
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Phiên làm việc đã hết hạn!"})
		return
	}

	var user domain.User
	if err := json.Unmarshal([]byte(userJSON), &user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi dữ liệu phiên!"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": gin.H{
			"username": user.Username,
			"role":     user.Role,
			"fullName": user.FullName,
			"email":    user.Email,
			"phone":    user.Phone,
		},
	})
}

// Logout deletes session from Redis and clears session cookie
func (h *AuthHandler) Logout(c *gin.Context) {
	sessionID, err := c.Cookie("ticketbox_session")
	if err == nil && sessionID != "" {
		sessionKey := fmt.Sprintf("session:%s", sessionID)
		h.redis.Del(c.Request.Context(), sessionKey)
	}

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("ticketbox_session", "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đăng xuất thành công!"})
}
