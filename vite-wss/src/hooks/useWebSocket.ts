import { useEffect, useRef, useState, useCallback } from "react";
import type { Todo, ClientMessage, ServerMessage } from "../shared/types.ts";

const WS_URL = import.meta.env.PROD
  ? `ws://${window.location.hostname}:${import.meta.env.VITE_WS_PORT || 3001}`
  : `ws://${window.location.hostname}:${window.location.port}/ws`;

const RECONNECT_DELAY = 2000;

interface UseWebSocketReturn {
  todos: Todo[];
  connected: boolean;
  addTodo: (text: string) => void;
  removeTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "state") {
          setTodos(message.todos);
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket server");
      setConnected(false);
      wsRef.current = null;

      // Schedule reconnection
      reconnectTimeoutRef.current = window.setTimeout(() => {
        console.log("Attempting to reconnect...");
        connect();
      }, RECONNECT_DELAY);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const addTodo = useCallback(
    (text: string) => {
      send({ type: "add", text });
    },
    [send]
  );

  const removeTodo = useCallback(
    (id: string) => {
      send({ type: "remove", id });
    },
    [send]
  );

  const toggleTodo = useCallback(
    (id: string) => {
      send({ type: "toggle", id });
    },
    [send]
  );

  return { todos, connected, addTodo, removeTodo, toggleTodo };
}
