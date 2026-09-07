import type {
  Vector3,
  Dimensions,
  WorldConfig,
  Grid,
  WorldObject,
  Player,
  NPC,
  StaticObject,
  ObjectRegistry,
  PositionRegistry,
  WorldState,
  SerializedWorldState,
} from "../shared/types.ts";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export class World {
  private config: WorldConfig;
  private grid: Grid;
  private objects: ObjectRegistry;
  private positions: PositionRegistry;

  constructor(size: Vector3) {
    this.config = { size };
    this.objects = new Map();
    this.positions = new Map();
    this.grid = this.createGrid(size);
  }

  private createGrid(size: Vector3): Grid {
    const grid: Grid = [];
    for (let x = 0; x < size.x; x++) {
      grid[x] = [];
      for (let y = 0; y < size.y; y++) {
        grid[x][y] = [];
        for (let z = 0; z < size.z; z++) {
          grid[x][y][z] = [];
        }
      }
    }
    return grid;
  }

  private isValidPosition(pos: Vector3, dims: Dimensions): boolean {
    return (
      pos.x >= 0 &&
      pos.y >= 0 &&
      pos.z >= 0 &&
      pos.x + dims.width <= this.config.size.x &&
      pos.y + dims.height <= this.config.size.y &&
      pos.z + dims.depth <= this.config.size.z
    );
  }

  private addToGrid(id: string, position: Vector3, dimensions: Dimensions): void {
    for (let x = position.x; x < position.x + dimensions.width; x++) {
      for (let y = position.y; y < position.y + dimensions.height; y++) {
        for (let z = position.z; z < position.z + dimensions.depth; z++) {
          this.grid[x][y][z].push(id);
        }
      }
    }
  }

  private removeFromGrid(id: string, position: Vector3, dimensions: Dimensions): void {
    for (let x = position.x; x < position.x + dimensions.width; x++) {
      for (let y = position.y; y < position.y + dimensions.height; y++) {
        for (let z = position.z; z < position.z + dimensions.depth; z++) {
          const cell = this.grid[x][y][z];
          const index = cell.indexOf(id);
          if (index !== -1) {
            cell.splice(index, 1);
          }
        }
      }
    }
  }

  addPlayer(name: string, position: Vector3): Player {
    const player: Player = {
      id: generateId(),
      type: "player",
      name,
      dimensions: { width: 1, height: 1, depth: 1 },
    };

    if (!this.isValidPosition(position, player.dimensions)) {
      throw new Error("Invalid spawn position");
    }

    this.objects.set(player.id, player);
    this.positions.set(player.id, { ...position });
    this.addToGrid(player.id, position, player.dimensions);

    return player;
  }

  removePlayer(playerId: string): boolean {
    const player = this.objects.get(playerId);
    const position = this.positions.get(playerId);

    if (!player || !position) {
      return false;
    }

    this.removeFromGrid(playerId, position, player.dimensions);
    this.objects.delete(playerId);
    this.positions.delete(playerId);

    return true;
  }

  addNPC(npcType: string, state: string, position: Vector3, dimensions: Dimensions): NPC {
    const npc: NPC = {
      id: generateId(),
      type: "npc",
      npcType,
      state,
      dimensions,
    };

    if (!this.isValidPosition(position, dimensions)) {
      throw new Error("Invalid NPC position");
    }

    this.objects.set(npc.id, npc);
    this.positions.set(npc.id, { ...position });
    this.addToGrid(npc.id, position, dimensions);

    return npc;
  }

  addStaticObject(
    objectType: string,
    position: Vector3,
    dimensions: Dimensions,
    properties?: Record<string, unknown>
  ): StaticObject {
    const obj: StaticObject = {
      id: generateId(),
      type: "static",
      objectType,
      dimensions,
      properties,
    };

    if (!this.isValidPosition(position, dimensions)) {
      throw new Error("Invalid object position");
    }

    this.objects.set(obj.id, obj);
    this.positions.set(obj.id, { ...position });
    this.addToGrid(obj.id, position, dimensions);

    return obj;
  }

  moveObject(id: string, newPosition: Vector3): boolean {
    const obj = this.objects.get(id);
    const currentPos = this.positions.get(id);

    if (!obj || !currentPos) {
      return false;
    }

    if (!this.isValidPosition(newPosition, obj.dimensions)) {
      return false;
    }

    this.removeFromGrid(id, currentPos, obj.dimensions);
    this.positions.set(id, { ...newPosition });
    this.addToGrid(id, newPosition, obj.dimensions);

    return true;
  }

  getObjectsAt(position: Vector3): WorldObject[] {
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.z < 0 ||
      position.x >= this.config.size.x ||
      position.y >= this.config.size.y ||
      position.z >= this.config.size.z
    ) {
      return [];
    }

    const ids = this.grid[position.x][position.y][position.z];
    return ids.map((id) => this.objects.get(id)!).filter(Boolean);
  }

  getObject(id: string): WorldObject | undefined {
    return this.objects.get(id);
  }

  getPosition(id: string): Vector3 | undefined {
    return this.positions.get(id);
  }

  getState(): WorldState {
    return {
      config: this.config,
      grid: this.grid,
      objects: this.objects,
      positions: this.positions,
    };
  }

  serialize(): SerializedWorldState {
    return {
      config: this.config,
      grid: this.grid,
      objects: Array.from(this.objects.entries()),
      positions: Array.from(this.positions.entries()),
    };
  }
}
