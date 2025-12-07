# WebSocket Server - Go Implementation

Go implementation of the WebSocket server with SSL support.

## Features

- WebSocket server with SSL/TLS support
- Client management with unique IDs
- Cursor position synchronization
- Periodic state broadcast (1 second intervals)
- Echo functionality
- Environment variable configuration

## Installation

```bash
# Install dependencies
go mod download

# Build
go build -o ws-server server.go
```

## Usage

### Run without SSL
```bash
go run server.go -nossl
# or
NOSSL=1 go run server.go
```

### Run with SSL
```bash
# Set environment variables
export PRIVKEY_PATH=/path/to/privkey.pem
export FULLCHAIN_PATH=/path/to/fullchain.pem
export PORT=9002

# Run server
go run server.go
```

### Using .env file
Create a `.env` file:
