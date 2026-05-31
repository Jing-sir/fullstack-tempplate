package main

import (
	"context"
	"log/slog"
	"os"

	"auth-service/internal/app"

	"github.com/joho/godotenv"
)

func main() {
	// 开发环境自动加载 .env 文件；生产环境 .env 不存在时静默跳过
	_ = godotenv.Load()

	// app.Run 负责初始化所有依赖并启动 HTTP 服务器，
	// 收到 SIGINT/SIGTERM 信号时优雅退出
	if err := app.Run(context.Background()); err != nil {
		slog.Error("服务异常退出", "err", err)
		os.Exit(1)
	}
}
