const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    // Send welcome message
    ws.send('Welcome to WebSocket server!');
    
    // Handle incoming messages
    ws.on('message', (message) => {
        console.log('Received:', message.toString());
        
        // Echo message back to client
        ws.send(`Echo: ${message}`);
        
        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(`Broadcast: ${message}`);
            }
        });
    });
    
    // Handle connection close
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// To install dependencies:
// npm install ws express