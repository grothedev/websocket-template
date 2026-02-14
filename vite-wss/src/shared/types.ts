export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export interface ServerState {
  todos: Todo[];
}

// Client -> Server messages
export interface QueryStateMessage {
  type: "query";
}

export interface AddTodoMessage {
  type: "add";
  text: string;
}

export interface RemoveTodoMessage {
  type: "remove";
  id: string;
}

export interface ToggleTodoMessage {
  type: "toggle";
  id: string;
}

export type ClientMessage =
  | QueryStateMessage
  | AddTodoMessage
  | RemoveTodoMessage
  | ToggleTodoMessage;

// Server -> Client messages
export interface StateUpdateMessage {
  type: "state";
  todos: Todo[];
}

export type ServerMessage = StateUpdateMessage;
