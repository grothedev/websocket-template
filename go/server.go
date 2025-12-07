package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"os"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

// Message represents the WebSocket message structure
type Message struct {
	Action string      `json:"action"`
	Data   interface{} `json:"data"`
}

// CursorData represents cursor position and nickname
type CursorData struct {
	Pos  [2]float64 `json:"pos"`
	Nick string     `json:"nick"`
}

// UpdatePosData represents the data for update_pos action
type UpdatePosData struct {
	Pos  [2]float64 `json:"pos"`
	Nick string     `json:"nick"`
}

// Client represents a connected WebSocket client
type Client struct {
	ID     string
	Conn   *websocket.Conn
	Send   chan Message
	Server *Server
}

// Server manages all WebSocket connections
type Server struct {
	Clients map[string]*Client
	Cursors map[string]CursorData
	mu      sync.RWMutex

	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan Message
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// NewServer creates a new WebSocket server
func NewServer() *Server {
	return &Server{
		Clients:    make(map[string]*Client),
		Cursors:    make(map[string]CursorData),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan Message),
	}
}

// Run starts the server's main event loop
func (s *Server) Run() {
	// Start periodic sync broadcast
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case client := <-s.Register:
			s.mu.Lock()
			s.Clients[client.ID] = client
			s.Cursors[client.ID] = CursorData{Pos: [2]float64{0, 0}, Nick: ""}
			s.mu.Unlock()

			log.Printf("Client registered: %s", client.ID)

			// Send init message with current state
			s.mu.RLock()
			cursors := make(map[string]CursorData)
			for k, v := range s.Cursors {
				cursors[k] = v
			}
			s.mu.RUnlock()

			client.Send <- Message{Action: "init", Data: cursors}

		case client := <-s.Unregister:
			s.mu.Lock()
			if _, ok := s.Clients[client.ID]; ok {
				delete(s.Clients, client.ID)
				delete(s.Cursors, client.ID)
				close(client.Send)
				log.Printf("Client unregistered: %s", client.ID)
			}
			s.mu.Unlock()

		case <-ticker.C:
			// Broadcast cursor positions to all clients
			s.mu.RLock()
			cursors := make(map[string]CursorData)
			for k, v := range s.Cursors {
				cursors[k] = v
			}
			s.mu.RUnlock()

			msg := Message{Action: "sync_data", Data: cursors}
			s.mu.RLock()
			for _, client := range s.Clients {
				select {
				case client.Send <- msg:
				default:
					// Client's send channel is full, skip
				}
			}
			s.mu.RUnlock()
		}
	}
}

// ReadPump reads messages from the WebSocket connection
func (c *Client) ReadPump() {
	defer func() {
		c.Server.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Error parsing message: %v", err)
			c.Send <- Message{Action: "error", Data: "Invalid message format"}
			continue
		}

		log.Printf("Received from %s: %s", c.ID, string(message))

		switch msg.Action {
		case "echo":
			c.Send <- Message{Action: "echo", Data: msg.Data}

		case "update_pos":
			// Parse the update_pos data
			dataBytes, err := json.Marshal(msg.Data)
			if err != nil {
				log.Printf("Error marshaling data: %v", err)
				continue
			}

			var updateData UpdatePosData
			if err := json.Unmarshal(dataBytes, &updateData); err != nil {
				log.Printf("Error parsing update_pos data: %v", err)
				continue
			}

			c.Server.mu.Lock()
			c.Server.Cursors[c.ID] = CursorData{
				Pos:  updateData.Pos,
				Nick: updateData.Nick,
			}
			c.Server.mu.Unlock()

			log.Printf("Updated cursor for %s: %+v", c.ID, c.Server.Cursors[c.ID])

		default:
			log.Printf("Unknown action: %s", msg.Action)
		}
	}
}

// WritePump writes messages to the WebSocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			data, err := json.Marshal(message)
			if err != nil {
				log.Printf("Error marshaling message: %v", err)
				continue
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Printf("Error writing message: %v", err)
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// HandleWebSocket handles WebSocket upgrade requests
func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Upgrade error: %v", err)
		return
	}

	clientID := uuid.New().String()
	client := &Client{
		ID:     clientID,
		Conn:   conn,
		Send:   make(chan Message, 256),
		Server: s,
	}

	log.Printf("New connection from: %s, assigned ID: %s", r.RemoteAddr, clientID)

	s.Register <- client

	// Start goroutines for reading and writing
	go client.WritePump()
	go client.ReadPump()
}

func main() {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Parse command line flags
	noSSL := flag.Bool("nossl", false, "Run without SSL")
	port := flag.String("port", "9002", "Server port")
	flag.Parse()

	// Override with environment variables if set
	if os.Getenv("NOSSL") != "" {
		*noSSL = true
	}
	if os.Getenv("PORT") != "" {
		*port = os.Getenv("PORT")
	}

	// Create and start server
	server := NewServer()
	go server.Run()

	// Setup HTTP routes
	http.HandleFunc("/", server.HandleWebSocket)

	addr := fmt.Sprintf(":%s", *port)

	// Start server with or without SSL
	if *noSSL || os.Getenv("PRIVKEY_PATH") == "" || os.Getenv("FULLCHAIN_PATH") == "" {
		log.Printf("Running without SSL on ws://localhost%s", addr)
		if err := http.ListenAndServe(addr, nil); err != nil {
			log.Fatal("ListenAndServe error: ", err)
		}
	} else {
		certFile := os.Getenv("FULLCHAIN_PATH")
		keyFile := os.Getenv("PRIVKEY_PATH")

		log.Printf("Running with SSL on wss://localhost%s", addr)
		if err := http.ListenAndServeTLS(addr, certFile, keyFile, nil); err != nil {
			log.Fatal("ListenAndServeTLS error: ", err)
		}
	}
}
