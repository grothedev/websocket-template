# WebSocket template
#### This project is meant to provide an example of how to implement a javascript application that uses WebSockets. Here are some things to know:
- the application is comprised of a client program and server program. the client is static javascript, and the server is a nodejs application.
- there are two implementation approaches here:
    1. Using the [javascript WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) and ['ws' node package](https://www.npmjs.com/package/ws)
    2. Using socket.io [client](https://socket.io/docs/v4/client-initialization/) and [server](https://www.npmjs.com/package/socket.io) libraries ([github repo](https://github.com/socketio/socket.io/tree/main))
- the ws implementation is in websocket-server-ws
- the socket.io implementation is in websocket-server-socketio
- both implementations also show how to encrypt the websocket connection with SSL
- the example implementation shows a webpage that renders the position of each connected client's mouse cursor on a canvas.

### The Client

### The server
