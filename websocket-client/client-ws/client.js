const color_bg = "#dedede";

let env = {
    'WS_URL': 'wss://localhost:8090'
}; //environment variables from server. dev=true by default because if env not passed in not public/published instance
let socket = null; //client's websocket
let domElems = {};

//APP START HERE
$(document).ready(async function() {

    log('init DOM');
    await initDOM();
    
    log('getting env vars');
    await getServerEnvVars();
    
    log('connect ws');
    connectWebSocket();
});

async function getServerEnvVars(){
    /*await axios.get('/env').then((res)=>{
        env = res.data;
        log(env);
    }).catch((err)=>{
        log(err);
    });*/
}

//initial setup such as hiding/showing certain things
function initDOM(){
    domElems.debugInfo = $('#infolog')[0];
    domElems.debugInfo.style.display = env.MODE == 'local' ? 'block' : 'none';
    domElems.status = $('#status')[0];
    domElems.status.innerHTML = 'Connecting...';
    domElems.status.style.color = 'yellow';
    domElems.body = $('body')[0];
    cnv = domElems.cnv; //for convenience
}

function wsConnected(){
    return (socket != null && socket.connected);
}

function connectWebSocket(){
    try {
        socket = new WebSocket(env['WS_URL']);
        socket.onerror = (err)=>{
            console.log('connection error');
            console.log(err);
            domElems.status.innerHTML = 'Connection error';
            domElems.status.style.color = 'red';
        }
        socket.onclose = (err) => {
            console.log('disconnected');
            console.log(err);
            domElems.status.innerHTML = 'Disconnected';
            domElems.status.style.color = 'orange';
        }

        //once connected, update the status pane and start broadcasting something. 
        socket.onopen = (err) => {
            if (err) log(err);
            socket.pingTimeout = 1000;
            socket.pingInterval = 500;
            domElems.status.innerHTML = 'Connected';
            domElems.status.style.color = 'green';
            setInterval(() => {
                send('updateFromClient', {content: 'this is an update for some hypothetical app', id: 'me?'});
            }, 1000);
        }

        socket.onmessage = (msg) => {
            try {
                // The data is in the .data property of the message event
                const m = JSON.parse(msg.data);
                switch (m.action) {
                    case 'init':
                        myID = m.data;
                        break;
                    case 'sync_data':
                        friends = {};
                        Object.keys(m.data).forEach((cid) => {
                            friends[cid] = m.data[cid];
                        });
                        domElems.numConnected.innerHTML = Object.keys(friends).length;
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.error('Error parsing message:', error);
                socket.send(JSON.stringify({ error: 'Invalid message format' }));
                return;
            }      
        }
        return true;
    } catch (err) {
        console.log(`failed to connec WS ${env['WS_URL']}`)
        console.error(err);
        return false;
    }
}

//considering every message as an "application action", but you could do whatever you want
function send(action, payload){
    if (socket != null && socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(JSON.stringify({action: action, data: payload}));
        } catch (e) {
            console.error('Error sending message:', e);
        }
    }
}