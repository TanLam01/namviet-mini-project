package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type IdempotencyRecord struct {
	Status       string `json:"status"` // "processing", "completed"
	ResponseCode int    `json:"response_code"`
	ResponseBody string `json:"response_body"`
}

type bodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *bodyWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// IdempotencyMiddleware ensures that duplicate POST requests with the same Idempotency-Key
// receive the cached response without running the business logic again.
func IdempotencyMiddleware(rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only apply to state-modifying requests (POST)
		if c.Request.Method != http.MethodPost {
			c.Next()
			return
		}

		key := c.GetHeader("Idempotency-Key")
		if key == "" {
			// Skip check if no key is provided (backward-compatible)
			c.Next()
			return
		}

		ctx := c.Request.Context()
		redisKey := fmt.Sprintf("idempotency:%s", key)

		// 1. Check if key exists in Redis
		val, err := rdb.Get(ctx, redisKey).Result()
		if err == nil {
			var record IdempotencyRecord
			if err := json.Unmarshal([]byte(val), &record); err == nil {
				if record.Status == "processing" {
					c.AbortWithStatusJSON(http.StatusConflict, gin.H{
						"error": "Yêu cầu giao dịch đang được xử lý, vui lòng không click liên tục!",
					})
					return
				}
				// Return cached response
				c.Header("X-Cache-Idempotency", "true")
				c.Data(record.ResponseCode, "application/json; charset=utf-8", []byte(record.ResponseBody))
				c.Abort()
				return
			}
		}

		// 2. Set key to "processing" with SetNX to prevent concurrent race condition (TTL of 5 minutes to prevent permanent lockouts)
		initialRecord := IdempotencyRecord{
			Status: "processing",
		}
		initialBytes, _ := json.Marshal(initialRecord)
		
		success, err := rdb.SetNX(ctx, redisKey, string(initialBytes), 5*time.Minute).Result()
		if err != nil || !success {
			c.AbortWithStatusJSON(http.StatusConflict, gin.H{
				"error": "Yêu cầu giao dịch trùng lặp đang được xử lý!",
			})
			return
		}

		// 3. Wrap response writer to capture output
		bw := &bodyWriter{
			ResponseWriter: c.Writer,
			body:           bytes.NewBufferString(""),
		}
		c.Writer = bw

		c.Next()

		// 4. Save response to Redis after handler completes
		status := c.Writer.Status()
		if status < 500 {
			completedRecord := IdempotencyRecord{
				Status:       "completed",
				ResponseCode: status,
				ResponseBody: bw.body.String(),
			}
			completedBytes, _ := json.Marshal(completedRecord)
			// Cache for 24 hours
			_ = rdb.Set(ctx, redisKey, string(completedBytes), 24*time.Hour).Err()
		} else {
			// On server error, delete key to allow retry
			_ = rdb.Del(ctx, redisKey).Err()
		}
	}
}
