import { useEffect, useRef, useState, useCallback } from "react";
import type {
  Vector3,
  WorldObject,
  ClientMessage,
  ServerMessage,
  SerializedWorldState,
} from "../shared/types.ts";

const WS_URL = import.meta.env.PROD
  ? `ws://${window.location.hostname}:${import.meta.env.VITE_WS_PORT || 3001}`
  : `ws://${window.location.hostname}:${window.location.port}/ws`;

const RECONNECT_DELAY = 2000;

export interface GameState {
  connected: boolean;
  joined: boolean;
  playerId: string | null;
  world: SerializedWorldState | null;
  error: string | null;
}

interface UseWebSocketReturn extends GameState {
  join: (name: string) => void;
  leave: () => void;
  move: (position: Vector3) => void;
  interact: (targetId: string) => void;
  getObject: (id: string) => WorldObject | undefined;
  getPosition: (id: string) => Vector3 | undefined;
}

export function useWebSocket(): UseWebSocketReturn {
  const [state, setState] = useState<GameState>({
    connected: false,
    joined: false,
    playerId: null,
    world: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case "state": {
        setState((prev) => ({
          ...prev,
          joined: true,
          playerId: message.playerId,
          world: message.world,
          error: null,
        }));
        break;
      }

      case "delta": {
        setState((prev) => {
          if (!prev.world) return prev;

          const objects = new Map(prev.world.objects);
          const positions = new Map(prev.world.positions);

          // Handle removed objects
          if (message.removed) {
            for (const id of message.removed) {
              objects.delete(id);
              positions.delete(id);
            }
          }

          // Handle added objects
          if (message.added) {
            for (const obj of message.added) {
              objects.set(obj.id, obj);
            }
          }

          // Handle moved objects
          if (message.moved) {
            for (const { id, position } of message.moved) {
              positions.set(id, position);
            }
          }

          return {
            ...prev,
            world: {
              ...prev.world,
              objects: Array.from(objects.entries()),
              positions: Array.from(positions.entries()),
            },
          };
        });
        break;
      }

      case "interact_result": {
        console.log("Interact result:", message);
        break;
      }

      case "error": {
        setState((prev) => ({ ...prev, error: message.message }));
        break;
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
      setState((prev) => ({ ...prev, connected: true, error: null }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        handleMessage(message);
      } catch {
        console.error("Failed to parse message");
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket server");
      setState({
        connected: false,
        joined: false,
        playerId: null,
        world: null,
        error: null,
      });
      wsRef.current = null;

      reconnectTimeoutRef.current = window.setTimeout(() => {
        console.log("Attempting to reconnect...");
        connectRef.current();
      }, RECONNECT_DELAY);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, [handleMessage]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const join = useCallback(
    (name: string) => {
      send({ type: "join", name });
    },
    [send]
  );

  const leave = useCallback(() => {
    send({ type: "leave" });
    setState((prev) => ({
      ...prev,
      joined: false,
      playerId: null,
      world: null,
    }));
  }, [send]);

  const move = useCallback(
    (position: Vector3) => {
      send({ type: "move", position });
    },
    [send]
  );

  const interact = useCallback(
    (targetId: string) => {
      send({ type: "interact", targetId });
    },
    [send]
  );

  const getObject = useCallback(
    (id: string): WorldObject | undefined => {
      if (!state.world) return undefined;
      const entry = state.world.objects.find(([objId]) => objId === id);
      return entry?.[1];
    },
    [state.world]
  );

  const getPosition = useCallback(
    (id: string): Vector3 | undefined => {
      if (!state.world) return undefined;
      const entry = state.world.positions.find(([objId]) => objId === id);
      return entry?.[1];
    },
    [state.world]
  );

  return {
    ...state,
    join,
    leave,
    move,
    interact,
    getObject,
    getPosition,
  };
}
