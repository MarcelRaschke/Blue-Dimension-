FROM golang:1.21-bookworm AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY main.go .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o osc-bridge .

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
  net-tools \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/osc-bridge .

RUN useradd --system --no-create-home --shell /usr/sbin/nologin app

USER app

ENV CDJ_OSC_PORT=7700
ENV ABLETON_OSC_ADDR=host.docker.internal:11000
ENV LOG_LEVEL=info

EXPOSE 7700/udp

CMD ["./osc-bridge"]
