package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	osc "github.com/hypebeast/go-osc/osc"
)

func main() {
	cdjPort := getEnv("CDJ_OSC_PORT", "7700")
	abletonAddr := getEnv("ABLETON_OSC_ADDR", "host.docker.internal:11000")
	logLevel := getEnv("LOG_LEVEL", "info")

	log.Printf("Starting Blue Dimension OSC Bridge")
	log.Printf("  CDJ OSC Port: %s", cdjPort)
	log.Printf("  Ableton Address: %s", abletonAddr)
	log.Printf("  Log Level: %s", logLevel)

	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("0.0.0.0:%s", cdjPort))
	if err != nil {
		log.Fatalf("Failed to resolve UDP address: %v", err)
	}

	conn, err := net.ListenUDP("udp", addr)
	if err != nil {
		log.Fatalf("Failed to listen on UDP port %s: %v", cdjPort, err)
	}
	defer conn.Close()

	log.Printf("Listening on UDP port %s", cdjPort)

	abletonParts := strings.Split(abletonAddr, ":")
	if len(abletonParts) != 2 {
		log.Fatalf("Invalid Ableton address format: %s (expected host:port)", abletonAddr)
	}
	abletonHost := abletonParts[0]
	abletonPort := abletonParts[1]

	abletonConn, err := net.Dial("udp", fmt.Sprintf("%s:%s", abletonHost, abletonPort))
	if err != nil {
		log.Printf("Warning: Failed to connect to Ableton at %s:%s: %v", abletonHost, abletonPort, err)
	} else {
		defer abletonConn.Close()
		log.Printf("Connected to Ableton at %s:%s", abletonHost, abletonPort)
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		sig := <-sigChan
		log.Printf("Received signal: %v, shutting down", sig)
		cancel()
	}()

	buffer := make([]byte, 4096)
	packetCount := 0
	startTime := time.Now()

	for {
		select {
		case <-ctx.Done():
			uptime := time.Since(startTime)
			log.Printf("OSC Bridge shutting down. Processed %d packets in %v", packetCount, uptime)
			return
		default:
		}

		conn.SetReadDeadline(time.Now().Add(5 * time.Second))
		n, remoteAddr, err := conn.ReadFromUDP(buffer)
		if err != nil {
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				continue
			}
			log.Printf("Error reading from UDP: %v", err)
			continue
		}

		packetCount++

		packet := buffer[:n]
		oscPacket := osc.NewOSCPacket(packet)

		if logLevel == "debug" {
			log.Printf("[%s] Received %d bytes: %v", remoteAddr.String(), n, oscPacket)
		}

		if abletonConn != nil {
			_, err := abletonConn.Write(packet)
			if err != nil {
				log.Printf("Failed to forward to Ableton: %v", err)
			} else if logLevel == "debug" {
				log.Printf("Forwarded to Ableton from %s", remoteAddr.String())
			}
		}
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
