import type { Plugin } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import type { Todo, ClientMessage, ServerMessage } from "../shared/types.ts";

let todos: Todo[] = [];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function broadcast(wss: WebSocketServer, message: ServerMessage): void {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function handleMessage(
  wss: WebSocketServer,
  ws: WebSocket,
  message: ClientMessage
): void {
  switch (message.type) {
    case "query": {
      const response: ServerMessage = { type: "state", todos };
      ws.send(JSON.stringify(response));
      break;
    }
    case "add": {
      const newTodo: Todo = {
        id: generateId(),
        text: message.text,
        completed: false,
      };
      todos.push(newTodo);
      broadcast(wss, { type: "state", todos });
      break;
    }
    case "remove": {
      todos = todos.filter((todo) => todo.id !== message.id);
      broadcast(wss, { type: "state", todos });
      break;
    }
    case "toggle": {
      todos = todos.map((todo) =>
        todo.id === message.id ? { ...todo, completed: !todo.completed } : todo
      );
      broadcast(wss, { type: "state", todos });
      break;
    }
  }
}

export function wsPlugin(): Plugin {
  return {
    name: "ws-plugin",
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });

      server.httpServer?.on("upgrade", (request, socket, head) => {
        if (request.url === "/ws") {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
          });
        }
      });

      wss.on("connection", (ws) => {
        console.log("Client connected");

        // Send current state on connect
        const response: ServerMessage = { type: "state", todos };
        ws.send(JSON.stringify(response));

        ws.on("message", (data) => {
          try {
            const message = JSON.parse(data.toString()) as ClientMessage;
            handleMessage(wss, ws, message);
          } catch (err) {
            console.error("Failed to parse message:", err);
          }
        });

        ws.on("close", () => {
          console.log("Client disconnected");
        });
      });
    },
  };
}
