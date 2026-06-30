package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	DB    *gorm.DB
	Redis *redis.Client
)

func Init() {
	// Load .env if present
	_ = godotenv.Load()

	initDB()
	initRedis()
}

func initDB() {
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "ticketbox")
	dbSSL := getEnv("DB_SSLMODE", "disable")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		dbHost, dbUser, dbPass, dbName, dbPort, dbSSL)

	// Try to connect to DB with retries (useful for docker-compose startup delay)
	var err error
	for i := 1; i <= 5; i++ {
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database (attempt %d/5): %v. Retrying in 3 seconds...", i, err)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Fatalf("Fatal: Failed to connect to PostgreSQL after retries: %v", err)
	}

	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	log.Println("PostgreSQL connection initialized successfully")
}

func initRedis() {
	redisAddr := getEnv("REDIS_ADDR", "localhost:6379")
	redisPass := getEnv("REDIS_PASSWORD", "")

	Redis = redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPass,
		DB:       0,
	})

	// Retry pinging Redis
	var err error
	for i := 1; i <= 5; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		_, err = Redis.Ping(ctx).Result()
		cancel()
		if err == nil {
			break
		}
		log.Printf("Failed to ping Redis (attempt %d/5): %v. Retrying in 2 seconds...", i, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Printf("Warning: Failed to connect to Redis: %v. Caching and locks may fail.", err)
	} else {
		log.Println("Redis connection initialized successfully")
	}
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
