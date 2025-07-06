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


//app-related data here (business logic)
let clients = {}; // ip address => socket
let cursors = {}; // id => [x,y]  cursor position

// Create WebSocket server with SSL
const wss = new WebSocket.Server({ server });
// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    console.log('New connection from:', req.socket.remoteAddress);
    clients[req.socket.remoteAddress] = ws;
    cursors[ws] = [0, 0]; // Initialize cursor position for the new client
    ws.emit('init', { cursors });
    

    ws.on('message', (message) => {
        console.log('Received:', message.toString());
        
        //TODO implement the thing from the other thing here
        //expect that the message is a JSON object, with "action" being the type of action, IOW the client's intent, and "data" being the payload of the action
        try {
            const parsedMessage = JSON.parse(message);
            console.log('Parsed message:', parsedMessage);
            switch (parsedMessage.action) {
                case 'echo':
                    ws.send(`Echo: ${parsedMessage.data}`);
                    break;
                case 'update_pos':
                    console.log('update pos')
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error);
            ws.send('Error: Invalid message format');
            return;
        }
    });
    
    // Handle connection close
    ws.on('close', () => {
        console.log('WebSocket connection closed');
        delete clients[req.socket.remoteAddress];
        delete cursors[ws];
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

const intervalId = setInterval(() => {
    // Broadcast cursor positions to all connected clients
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ action: 'sync_data', data: cursors }));
        }
    });
}, 1000);
// To generate self-signed certificates for development:
// mkdir ssl
// openssl req -x509 -newkey rsa:4096 -keyout ssl/server.key -out ssl/server.cert -days 365 -nodes
//
// To install dependencies:
// npm install ws express