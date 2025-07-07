require('dotenv').config();
const crypto = require('crypto');
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


//TODO separate app logic from websocket logic
//app-related data here (business logic)
let clients = {}; // clientId => socket
let cursors = {}; // clientId => { pos: [x,y], nick: '' }

// Create WebSocket server with SSL
const wss = new WebSocket.Server({ server });
// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    const clientId = crypto.randomUUID();
    console.log(`New connection from: ${req.socket.remoteAddress}, assigned ID: ${clientId}`);

    // Store client by its unique ID
    clients[clientId] = ws;
    cursors[clientId] = { pos: [0, 0], nick: '' }; // Initialize cursor position
    ws.clientId = clientId; // Attach the ID to the ws object for easy lookup

    // Send the new client its ID and the current state
    send(ws, 'init', cursors );

    ws.on('message', (message) => {
        console.log('Received:', message.toString());

        try {
            const m = JSON.parse(message);
            console.log('Parsed message:', m);
            switch (m.action) {
                case 'echo':
                    send(ws, 'echo', m.data);
                    break;
                case 'update_pos':
                    // FIX 2: Use the client's unique ID to update the cursor
                    if (cursors[ws.clientId]) {
                        cursors[ws.clientId] = {
                            pos: m.data.pos,
                            nick: m.data.nick
                        };
                        console.log(`Updated cursor for ${ws.clientId}:`, cursors[ws.clientId]);
                    }
                    break;
                default:
                    console.warn(`Unknown action: ${m.action}`);
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error);
            send(ws, 'error', 'Invalid message format');
            return;
        }
    });
    
    // Handle connection close
    ws.on('close', () => {
        console.log(`WebSocket connection closed for ID: ${ws.clientId}`);
        // Clean up using the client's unique ID
        delete clients[ws.clientId];
        delete cursors[ws.clientId];
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Start secure server
const PORT = process.env.PORT || 8090;
server.listen(PORT, () => {
    console.log(`WebSocket server running on wss://localhost:${PORT}`);
});

const intervalId = setInterval(() => {
    // Broadcast cursor positions to all connected clients
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            send(client, 'sync_data', cursors );
        }
    });
}, 1000);

//send action+payload to come client. TODO this will be part of a custom "AppSocket" which extends WebSocket
function send(skt, action, payload) {
    if (skt && skt.readyState === WebSocket.OPEN) {
        try {
            skt.send(JSON.stringify({ action: action, data: payload }));
        } catch (e) {
            console.error('Error sending message:', e);
        }
    } else {
        console.warn('Socket is not open or does not exist');
    }
}
// To generate self-signed certificates for development:
// mkdir ssl
// openssl req -x509 -newkey rsa:4096 -keyout ssl/server.key -out ssl/server.cert -days 365 -nodes
//
// To install dependencies:
// npm install ws express