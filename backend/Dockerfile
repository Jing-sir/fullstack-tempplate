FROM golang:1.25-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o /out/auth-service ./cmd

FROM alpine:3.22

WORKDIR /app
COPY --from=build /out/auth-service /app/auth-service

EXPOSE 8800
ENTRYPOINT ["/app/auth-service"]

