const WebSocket = require('ws');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

let serverOptions = {};
let server;

if (process.env.NOSSL || process.env.PRIVKEY_PATH == null || process.env.FULLCHAIN_PATH == null){
    console.log("Running without SSL.");
    server = require('http').createServer(app);
} else {
    console.log("Running with SSL.");
    serverOptions = {
        //key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
        //cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.cert'))
        key: fs.readFileSync(process.env.PRIVKEY_PATH),
        cert: fs.readFileSync(process.env.FULLCHAIN_PATH)
    
    };
    server = require('https').createServer(serverOptions, app);
}

// Create WebSocket server with SSL
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    console.log('New connection from:', req.connection.remoteAddress);
    
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

// Start secure server
const PORT = 8443;
server.listen(PORT, () => {
    console.log(`WebSocket server running on wss://localhost:${PORT}`);
});

// To generate self-signed certificates for development:
// mkdir ssl
// openssl req -x509 -newkey rsa:4096 -keyout ssl/server.key -out ssl/server.cert -days 365 -nodes
//
// To install dependencies:
// npm install ws express