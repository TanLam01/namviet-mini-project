package http

import (
	"net/http"

	"backend/delivery/sse"
	"backend/domain"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type TicketHandler struct {
	useCase domain.TicketUseCase
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

// NewTicketHandler maps routes to handlers, applying Auth/Admin middlewares
func NewTicketHandler(r *gin.RouterGroup, uc domain.TicketUseCase, rdb *redis.Client) {
	h := &TicketHandler{
		useCase: uc,
	}

	// Public routes
	r.GET("/tickets", h.GetTickets)
	r.GET("/tickets/stats", h.GetStats)
	r.GET("/tickets/sse", h.ServeSSE)

	// Protected routes (requires user login)
	authGroup := r.Group("")
	authGroup.Use(AuthMiddleware(rdb))
	{
		authGroup.POST("/tickets/hold", h.HoldTickets)
		authGroup.POST("/tickets/pay", h.ConfirmPayment)
		authGroup.POST("/tickets/release", h.ReleaseTickets)

		// Admin-only route
		authGroup.POST("/tickets/reset", AdminMiddleware(), h.ResetAllTickets)
	}
}

// GetTickets godoc
// @Summary      Lấy danh sách toàn bộ vé
// @Description  Trả về danh sách 500 vị trí ghế ngồi (VIP, GA, STANDARD) kèm trạng thái
// @Tags         tickets
// @Produce      json
// @Success      200  {array}   domain.Ticket
// @Failure      500  {object}  map[string]string
// @Router       /tickets [get]
func (h *TicketHandler) GetTickets(c *gin.Context) {
	tickets, err := h.useCase.GetTickets()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tickets)
}

// GetStats godoc
// @Summary      Lấy thống kê trạng thái vé
// @Description  Trả về số lượng vé đã bán, đang giữ, còn trống, tổng doanh thu và số lượng chi tiết từng loại vé
// @Tags         tickets
// @Produce      json
// @Success      200  {object}  domain.Stats
// @Failure      500  {object}  map[string]string
// @Router       /tickets/stats [get]
func (h *TicketHandler) GetStats(c *gin.Context) {
	stats, err := h.useCase.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

type HoldTicketsRequest struct {
	TicketIDs []string `json:"ticketIds" binding:"required,min=1"`
	BuyerName string   `json:"buyerName" binding:"required"`
}

// HoldTickets godoc
// @Summary      Giữ ghế tạm thời (5 phút) cho nhiều ghế
// @Description  Khóa một hoặc nhiều ghế độc quyền cho người dùng mua vé, ngăn chặn race condition bằng Redis lock và Postgres FOR UPDATE lock.
// @Tags         tickets
// @Accept       json
// @Produce      json
// @Param        request body HoldTicketsRequest true "Dữ liệu chọn nhiều ghế giữ vé"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Router       /tickets/hold [post]
func (h *TicketHandler) HoldTickets(c *gin.Context) {
	var req HoldTicketsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu gửi lên không đúng định dạng hoặc thiếu danh sách ghế!"})
		return
	}

	err := h.useCase.HoldTickets(c.Request.Context(), req.TicketIDs, req.BuyerName)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Đã giữ các ghế thành công trong 5 phút!"})
}

type ConfirmPaymentRequest struct {
	TicketIDs []string `json:"ticketIds" binding:"required,min=1"`
	FullName  string   `json:"fullName" binding:"required"`
	Email     string   `json:"email" binding:"required,email"`
	Phone     string   `json:"phone" binding:"required"`
}

// ConfirmPayment godoc
// @Summary      Thanh toán giao dịch nhiều vé
// @Description  Xác nhận thanh toán thành công cho danh sách vé đang được giữ, cập nhật thông tin khách hàng và đổi trạng thái sang Sold.
// @Tags         tickets
// @Accept       json
// @Produce      json
// @Param        request body ConfirmPaymentRequest true "Thông tin thanh toán khách hàng"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Router       /tickets/pay [post]
func (h *TicketHandler) ConfirmPayment(c *gin.Context) {
	var req ConfirmPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thông tin thanh toán không hợp lệ hoặc thiếu trường!"})
		return
	}

	err := h.useCase.ConfirmPayment(c.Request.Context(), req.TicketIDs, req.FullName, req.Email, req.Phone)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Thanh toán thành công!"})
}

type ReleaseTicketsRequest struct {
	TicketIDs []string `json:"ticketIds" binding:"required,min=1"`
}

// ReleaseTickets godoc
// @Summary      Giải phóng danh sách ghế giữ sớm
// @Description  Hủy phiên giữ nhiều vé trước thời hạn 5 phút, trả vé về trạng thái Available cho người khác chọn.
// @Tags         tickets
// @Accept       json
// @Produce      json
// @Param        request body ReleaseTicketsRequest true "Danh sách mã vé cần hủy giữ"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /tickets/release [post]
func (h *TicketHandler) ReleaseTickets(c *gin.Context) {
	var req ReleaseTicketsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Danh sách mã vé không hợp lệ!"})
		return
	}

	err := h.useCase.ReleaseTickets(c.Request.Context(), req.TicketIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Đã giải phóng các vé thành công!"})
}

// ResetAllTickets godoc
// @Summary      Reset toàn bộ hệ thống
// @Description  Xóa sạch toàn bộ dữ liệu giao dịch và seeding lại 500 ghế trống ban đầu.
// @Tags         tickets
// @Produce      json
// @Success      200  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /tickets/reset [post]
func (h *TicketHandler) ResetAllTickets(c *gin.Context) {
	err := h.useCase.ResetAllTickets()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Hệ thống vé đã được reset thành công!"})
}

func (h *TicketHandler) ServeSSE(c *gin.Context) {
	sse.Broker.ServeHTTP(c.Writer, c.Request)
}
