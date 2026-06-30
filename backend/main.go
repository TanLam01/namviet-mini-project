package main

import (
	"log"
	"os"
	"time"

	"backend/config"
	delivery "backend/delivery/http"
	"backend/delivery/sse"
	"backend/domain"
	"backend/repository"
	"backend/usecase"

	_ "backend/docs"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, Idempotency-Key")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "X-Cache-Idempotency")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// @title           Mini Ticketbox API
// @version         1.0
// @description     Hệ thống đặt vé Concert tải cực cao, chống race condition bằng Redis lock & Postgres FOR UPDATE lock, kết hợp SSE real-time.
// @host            localhost:8080
// @BasePath        /api
func main() {
	log.Println("Starting Mini Ticketbox Backend (Clean Architecture)...")

	// 1. Init Config & Connections
	config.Init()

	// 2. Run Database AutoMigrate (Ticket and User tables)
	log.Println("Running database migrations...")
	err := config.DB.AutoMigrate(&domain.Ticket{}, &domain.User{})
	if err != nil {
		log.Fatalf("Fatal: Database AutoMigrate failed: %v", err)
	}

	// 3. Dependency Injection
	
	// User layer
	userRepo := repository.NewPostgresUserRepository(config.DB)
	userUseCase := usecase.NewUserUseCase(userRepo)

	// Ticket layer
	ticketRepo := repository.NewPostgresTicketRepository(config.DB, config.Redis)
	ticketUseCase := usecase.NewTicketUseCase(ticketRepo)

	// Seed users
	if err := userUseCase.SeedDefaultUsers(); err != nil {
		log.Fatalf("Fatal: Database user seeding failed: %v", err)
	}

	// Seed tickets
	if err := ticketUseCase.SeedTickets(); err != nil {
		log.Fatalf("Fatal: Database ticket seeding failed: %v", err)
	}

	// 4. Initialize SSE Broker
	sse.InitSSE()

	// 5. Start background ticket release checker
	ticketUseCase.StartCleanupWorker(3 * time.Second)

	// 6. Server Routing Setup
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	_ = r.SetTrustedProxies(nil) // Khai báo bảo mật không sử dụng proxy trung gian
	r.Use(CORSMiddleware())
	r.Use(delivery.IdempotencyMiddleware(config.Redis))

	// Swagger UI Route
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	apiGroup := r.Group("/api")
	
	// Register HTTP Handlers
	delivery.NewTicketHandler(apiGroup, ticketUseCase, config.Redis)
	delivery.NewAuthHandler(apiGroup, userUseCase, config.Redis)

	// 7. Start Web Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server listening on port %s", port)
	log.Printf("Swagger documentation available at http://localhost:%s/swagger/index.html", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Fatal: Server failed to start: %v", err)
	}
}
