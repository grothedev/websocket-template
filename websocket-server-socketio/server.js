// Node.js WebSocket server
require('dotenv').config();
const fs = require('fs');
let HOST = 'localhost';
let PORT = 3000;
const express = require('express');
const cors = require('cors');

//HTTP server
const app = express();
var hsopts, hs;

//use ssl (https) by default
if (process.env.NOSSL || process.env.PRIVKEY_PATH == null || process.env.FULLCHAIN_PATH == null){
    console.log("Running without SSL.");
    hs = require('http').createServer(app);
} else {
    console.log("Running with SSL.");
    hsopts = {
        key: fs.readFileSync(process.env.PRIVKEY_PATH),
        cert: fs.readFileSync(process.env.FULLCHAIN_PATH)
    };
    hs = require('https').createServer(hsopts,app);
}

//create the websocket server
const io = require('socket.io')(hs, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
if (process.argv.length > 2){
    HOST = process.argv[2];
} else if (process.env.HOST != null) {
    HOST = process.env.HOST;
}
if (process.argv.length > 3){
    PORT = process.argv[3];
} else if (process.env.PORT != null){
    PORT = process.env.PORT;
}

//one endpoint just for information
app.get('/', (req, res)=>{
    res.send('This is a websocket server. It does not host the client. Connect with a websocket client.');
});

hs.listen(PORT, HOST, (error)=>{
    if (!error) {
        console.log(`Server is running on http://${HOST}:${PORT}`);
    } else {
        console.log(error);
    }
});

//sockets connection setup
//var clients = []; // { id, position, socket } 
var clients = {}; // id => socket
var cursors = {}; // id => [x,y]. in future will have more data associated with the "player"
var addresses = {}; // id => ip address

//setup the websocket server event handlers
io.on('connection', function(skt) {
    console.log(`client connected: ${skt.id}`);
    clients[skt.id] = skt;
    cursors[skt.id] = [0, 0];
    addresses[skt.id] = skt.handshake.headers['x-forwarded-for'] || skt.handshake.address; 
    skt.emit('init', skt.id); //send client its id and all other cursors

    //register for msgs from clients
    skt.on('update_pos', (data)=>{
        cursors[skt.id] = {
            pos: data.pos,
            nick: data.nick
        }
    });

    skt.on('disconnect', ()=>{
        console.log(`client disconnected: ${skt.id}`);
        delete clients[skt.id];
        delete cursors[skt.id];
    });
});

hs.on('error', (error)=>{
    console.log(error);
});

//sync data every second. NOTE in future could be multiple threads
const intervalId = setInterval(() => {
    //TODO should this be all clients in one msg? 
    for (const cid in clients){
        clients[cid].emit('sync_data', cursors); //update client's worldmodel
        console.log(`syncing data to ${cid}, ${addresses[cid]}`);
    }
}, 1000);
