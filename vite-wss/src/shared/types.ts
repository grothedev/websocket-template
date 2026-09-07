// === Coordinates ===
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions {
  width: number;   // x span
  height: number;  // y span
  depth: number;   // z span
}

// === Grid System ===
export interface WorldConfig {
  size: Vector3;  // grid bounds
}

// Dense 3D grid: grid[x][y][z] -> array of object IDs
export type Grid = string[][][][];

// === World Objects (serializable for network) ===
export interface WorldObject {
  id: string;
  type: "player" | "npc" | "static";
  dimensions: Dimensions;
  properties?: Record<string, unknown>;
}

export interface Player extends WorldObject {
  type: "player";
  name: string;
}

export interface NPC extends WorldObject {
  type: "npc";
  npcType: string;
  state: string;
}

export interface StaticObject extends WorldObject {
  type: "static";
  objectType: string;
}

// === Position tracking (object ID -> origin position) ===
export type PositionRegistry = Map<string, Vector3>;

// === Object Registry ===
export type ObjectRegistry = Map<string, WorldObject>;

// === World State ===
export interface WorldState {
  config: WorldConfig;
  grid: Grid;
  objects: ObjectRegistry;
  positions: PositionRegistry;
}

// === Serializable World State (for network transmission) ===
export interface SerializedWorldState {
  config: WorldConfig;
  grid: Grid;
  objects: [string, WorldObject][];
  positions: [string, Vector3][];
}

// === Client -> Server Messages ===
export interface JoinMessage {
  type: "join";
  name: string;
}

export interface LeaveMessage {
  type: "leave";
}

export interface MoveMessage {
  type: "move";
  position: Vector3;
}

export interface InteractMessage {
  type: "interact";
  targetId: string;
}

export interface QueryStateMessage {
  type: "query";
}

export type ClientMessage =
  | JoinMessage
  | LeaveMessage
  | MoveMessage
  | InteractMessage
  | QueryStateMessage;

// === Server -> Client Messages ===
export interface StateUpdateMessage {
  type: "state";
  playerId: string;
  world: SerializedWorldState;
}

export interface DeltaUpdateMessage {
  type: "delta";
  added?: WorldObject[];
  removed?: string[];
  moved?: { id: string; position: Vector3 }[];
}

export interface InteractResultMessage {
  type: "interact_result";
  targetId: string;
  success: boolean;
  result?: unknown;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type ServerMessage =
  | StateUpdateMessage
  | DeltaUpdateMessage
  | InteractResultMessage
  | ErrorMessage;
