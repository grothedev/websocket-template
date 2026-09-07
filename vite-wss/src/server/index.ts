import { WebSocketServer, WebSocket } from "ws";
import type {
  ClientMessage,
  ServerMessage,
  Player,
  Vector3,
} from "../shared/types.ts";
import { World } from "./world.ts";

const PORT = parseInt(process.env.PORT || "3001", 10);
const WORLD_SIZE: Vector3 = { x: 50, y: 10, z: 50 };

const world = new World(WORLD_SIZE);

// Map WebSocket connections to player IDs
const clientPlayers = new Map<WebSocket, string>();

function broadcast(wss: WebSocketServer, message: ServerMessage, exclude?: WebSocket): void {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== exclude) {
      client.send(data);
    }
  });
}

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function getSpawnPosition(): Vector3 {
  return {
    x: Math.floor(Math.random() * (WORLD_SIZE.x - 2)) + 1,
    y: 0,
    z: Math.floor(Math.random() * (WORLD_SIZE.z - 2)) + 1,
  };
}

function handleMessage(
  wss: WebSocketServer,
  ws: WebSocket,
  message: ClientMessage
): void {
  const playerId = clientPlayers.get(ws);

  switch (message.type) {
    case "join": {
      if (playerId) {
        send(ws, { type: "error", message: "Already joined" });
        return;
      }

      try {
        const player = world.addPlayer(message.name, getSpawnPosition());
        clientPlayers.set(ws, player.id);

        send(ws, {
          type: "state",
          playerId: player.id,
          world: world.serialize(),
        });

        const position = world.getPosition(player.id)!;
        broadcast(wss, {
          type: "delta",
          added: [player],
          moved: [{ id: player.id, position }],
        }, ws);

        console.log(`Player ${player.name} (${player.id}) joined`);
      } catch {
        send(ws, { type: "error", message: "Failed to join" });
      }
      break;
    }

    case "leave": {
      if (!playerId) return;

      const player = world.getObject(playerId) as Player | undefined;
      if (player && world.removePlayer(playerId)) {
        clientPlayers.delete(ws);
        broadcast(wss, { type: "delta", removed: [playerId] });
        console.log(`Player ${player.name} (${playerId}) left`);
      }
      break;
    }

    case "move": {
      if (!playerId) {
        send(ws, { type: "error", message: "Not joined" });
        return;
      }

      if (world.moveObject(playerId, message.position)) {
        broadcast(wss, {
          type: "delta",
          moved: [{ id: playerId, position: message.position }],
        });
      } else {
        send(ws, { type: "error", message: "Invalid move" });
      }
      break;
    }

    case "interact": {
      if (!playerId) {
        send(ws, { type: "error", message: "Not joined" });
        return;
      }

      const target = world.getObject(message.targetId);
      if (!target) {
        send(ws, {
          type: "interact_result",
          targetId: message.targetId,
          success: false,
        });
        return;
      }

      send(ws, {
        type: "interact_result",
        targetId: message.targetId,
        success: true,
        result: { objectType: target.type },
      });
      break;
    }

    case "query": {
      if (!playerId) {
        send(ws, { type: "error", message: "Not joined" });
        return;
      }

      send(ws, {
        type: "state",
        playerId,
        world: world.serialize(),
      });
      break;
    }
  }
}

function setupInitialWorld(): void {
  world.addStaticObject("tree", { x: 10, y: 0, z: 10 }, { width: 1, height: 3, depth: 1 });
  world.addStaticObject("tree", { x: 15, y: 0, z: 20 }, { width: 1, height: 3, depth: 1 });
  world.addStaticObject("rock", { x: 25, y: 0, z: 15 }, { width: 2, height: 1, depth: 2 });
  world.addStaticObject("chest", { x: 30, y: 0, z: 30 }, { width: 1, height: 1, depth: 1 }, { loot: ["gold", "sword"] });
  world.addNPC("guard", "patrol", { x: 20, y: 0, z: 20 }, { width: 1, height: 2, depth: 1 });

  console.log("World initialized with objects");
}

setupInitialWorld();

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on ws://localhost:${PORT}`);

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage;
      handleMessage(wss, ws, message);
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  });

  ws.on("close", () => {
    const playerId = clientPlayers.get(ws);
    if (playerId) {
      const player = world.getObject(playerId) as Player | undefined;
      world.removePlayer(playerId);
      clientPlayers.delete(ws);
      broadcast(wss, { type: "delta", removed: [playerId] });
      console.log(`Player ${player?.name || playerId} disconnected`);
    }
    console.log("Client disconnected");
  });
});
