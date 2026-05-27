package main

import (
	"auth-service/internal/app"
	"context"
	"log"
)

func main() {
	if err := app.Run(context.Background()); err != nil {
		log.Fatal(err)
	}
}
