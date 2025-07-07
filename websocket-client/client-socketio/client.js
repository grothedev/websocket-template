import { io } from './socket.io.esm.min.js';

const WS_URL = '192.168.4.32:8080'; 
//const API_URL = 'http://localhost:9002';
const color_bg = "#dedede";

var ctx = null;
var cnv = null;
var W = 800;
var H = 600;
var socket = null;
var myID;

var elemNumConnected;

//each connected client. same format as server's model
var friends = {

};

var me = [0,0]; //my cursor position
var myNickname = ''; 

var domElems = {};

//APP START HERE
$(document).ready(function() {
    cnv = $('#bg')[0];
    if (cnv != null) {
        getServerEnvVars();
        initDOM();

        ctx = cnv.getContext("2d");
        W = window.outerWidth;
        H = window.outerHeight;
        cnv.width = W;
        cnv.height = H;
        ctx.fillStyle = color_bg;
        ctx.fillRect(0,0,W,H);
        
        if (connectWebSocket()){
            setInterval(() => {
                socket.emit('update_pos', {pos: me, nick: myNickname});
            }, 100);
        } else {
            console.error('Failed to connect web sockets');
            domElems.debugInfo.innerHTML = 'Unable to connect to web socket server';
        }
        document.onmousemove = (e) => handleMouseMove(e);
        setInterval(() => {
            draw();
        }, 20);
        window.addEventListener('resize', resizeCanvas);
    } else {
        console.error('Canvas element not found');
    }
    
});

function getServerEnvVars(){
    axios.get('/env').then((res)=>{
        console.log(res);//TODO set api url from this
    });
}

//initial setup such as hiding/showing certain things
function initDOM(){
    domElems.numConnected = $('#numFriendsConnected')[0];
    domElems.inputFile = $('#f')[0];
    domElems.debugInfo = $('#debugInfo')[0];    domElems.inputWho = $('#input_who')[0];
    domElems.inputWho.onchange = ()=> { myNickname = domElems.inputWho.value; };
}

function resizeCanvas() {
    W = window.outerWidth;
    H = window.outerHeight;
    cnv.width = W;
    cnv.height = H;
}

function connectWebSocket(){
    try {
        socket = io(WS_URL, {
            secure: true,
            rejectUnauthorized: false
        });
        socket.on('connect_error', (err) => {
            console.log('connection error');
            console.log(err);
            //TODO $('').textContent = err;
        });
        socket.on('connect_failed', (err) => {
            console.log('conn failed');
            console.log(err);
            //TODO $('').textContent = err;
        });
        socket.on('disconnect', (err) => {
            console.log('disconnected');
            console.log(err);
            //TODO $('').textContent = err;
        });
        socket.on('connect', (err) => {
            console.log('connected');
            if (err) console.log(err);
            //TODO $('').textContent = 'Connected';
            socket.pingTimeout = 1000;
            socket.pingInterval = 500;
        });
        socket.on('syncCanvas', (data) => {
            //TODO appShapes = data.shapes;
            //TODO ClearBake();
            //TODO DrawCanvas();
            //TODO $('').textContent = 'Synced';
        });
        socket.on('init', (id) => {
            myID = id;
        });

        //sync data from server. this is the data from server that should be replicated on each client
        socket.on('sync_data', (data) => {
            //data is a map of client id to client payload data (currently just the screen position)
            friends = {};
            for (const cid in data){
                if (cid == myID){
                    continue;
                }
                friends[cid] = data[cid];
            }
            domElems.numConnected.innerHTML = Object.keys(friends).length + 1;
        });
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

function draw() {
    //draw background
    ctx.fillStyle = color_bg;
    ctx.fillRect(0,0,W,H);
    
    //draw me
    ctx.fillStyle = "#000000";
    ctx.fillRect(me[0], me[1], 4, 4);
    if (myNickname != ''){
        ctx.fillText(myNickname, me[0], me[1]);
    }

    //draw friends
    Object.keys(friends).forEach((fid)=>{
        ctx.fillStyle = "#050505";
        let x = friends[fid].pos[0];
        let y =friends[fid].pos[1];
        ctx.fillRect(x, y, 6, 6);
        if (friends[fid].nick != ''){
            ctx.fillText(friends[fid].nick, x, y);
        }
    });

}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    /*return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };*/
    return [evt.clientX - rect.left, evt.clientY - rect.top];
}


function handleMouseMove(e) {
    var eDoc, doc, body;
    e = e || window.event; // IE-ism
    // If pageX/Y aren't available and clientX/Y are,
    // calculate pageX/Y - logic taken from jQuery.
    // (This is to support old IE)
    if (e.pageX == null && e.clientX != null) {
        eventDoc = (e.target && e.target.ownerDocument) || document;
        doc = eventDoc.documentElement;
        body = eventDoc.body;

        e.pageX = e.clientX +
            (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
            (doc && doc.clientLeft || body && body.clientLeft || 0);
        e.pageY = e.clientY +
            (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
            (doc && doc.clientTop  || body && body.clientTop  || 0 );
    }
    me = getMousePos(cnv, e);
}
