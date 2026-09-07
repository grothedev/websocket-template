import { useEffect, useCallback, useMemo } from "react";
import type { Vector3, WorldObject, SerializedWorldState } from "../shared/types.ts";

interface GameWorldProps {
  world: SerializedWorldState;
  playerId: string;
  onMove: (position: Vector3) => void;
  onInteract: (targetId: string) => void;
  onLeave: () => void;
}

const CELL_SIZE = 12;
const COLORS: Record<string, string> = {
  player: "#4ade80",
  npc: "#f59e0b",
  tree: "#22c55e",
  rock: "#6b7280",
  chest: "#eab308",
  static: "#8b5cf6",
};

function getObjectColor(obj: WorldObject): string {
  if (obj.type === "static") {
    const staticObj = obj as WorldObject & { objectType?: string };
    return COLORS[staticObj.objectType || "static"] || COLORS.static;
  }
  return COLORS[obj.type] || "#ffffff";
}

export function GameWorld({
  world,
  playerId,
  onMove,
  onInteract,
  onLeave,
}: GameWorldProps) {
  const positions = useMemo(() => new Map(world.positions), [world.positions]);
  const objects = useMemo(() => new Map(world.objects), [world.objects]);

  const playerPos = positions.get(playerId);
  const player = objects.get(playerId);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!playerPos) return;

      let newPos: Vector3 | null = null;

      switch (e.key) {
        case "ArrowUp":
        case "w":
          newPos = { ...playerPos, z: playerPos.z - 1 };
          break;
        case "ArrowDown":
        case "s":
          newPos = { ...playerPos, z: playerPos.z + 1 };
          break;
        case "ArrowLeft":
        case "a":
          newPos = { ...playerPos, x: playerPos.x - 1 };
          break;
        case "ArrowRight":
        case "d":
          newPos = { ...playerPos, x: playerPos.x + 1 };
          break;
        case "q":
          newPos = { ...playerPos, y: playerPos.y + 1 };
          break;
        case "e":
          newPos = { ...playerPos, y: playerPos.y - 1 };
          break;
        case " ": {
          // Interact with nearby objects
          const nearby = Array.from(objects.entries()).find(([id]) => {
            if (id === playerId) return false;
            const pos = positions.get(id);
            if (!pos) return false;
            const dist = Math.abs(pos.x - playerPos.x) + Math.abs(pos.z - playerPos.z);
            return dist <= 2;
          });
          if (nearby) {
            onInteract(nearby[0]);
          }
          return;
        }
      }

      if (newPos) {
        e.preventDefault();
        onMove(newPos);
      }
    },
    [playerPos, onMove, onInteract, objects, positions, playerId]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const gridWidth = world.config.size.x * CELL_SIZE;
  const gridHeight = world.config.size.z * CELL_SIZE;

  // Render objects at current Y level (or all levels for simplicity)
  const currentY = playerPos?.y ?? 0;

  return (
    <div className="game-world">
      <div className="game-header">
        <span className="player-info">
          {(player as WorldObject & { name?: string })?.name || "Player"} at ({playerPos?.x}, {playerPos?.y}, {playerPos?.z})
        </span>
        <span className="level-info">Level: Y={currentY}</span>
        <button onClick={onLeave} className="leave-btn">Leave</button>
      </div>

      <div className="game-controls">
        <span>Move: WASD/Arrows</span>
        <span>Up/Down: Q/E</span>
        <span>Interact: Space</span>
      </div>

      <div
        className="game-grid"
        style={{
          width: gridWidth,
          height: gridHeight,
          backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
        }}
      >
        {Array.from(objects.entries()).map(([id, obj]) => {
          const pos = positions.get(id);
          if (!pos) return null;

          const isCurrentPlayer = id === playerId;
          const isNearby =
            playerPos &&
            Math.abs(pos.x - playerPos.x) + Math.abs(pos.z - playerPos.z) <= 2;

          return (
            <div
              key={id}
              className={`game-object ${obj.type} ${isCurrentPlayer ? "current-player" : ""} ${isNearby && !isCurrentPlayer ? "nearby" : ""}`}
              style={{
                left: pos.x * CELL_SIZE,
                top: pos.z * CELL_SIZE,
                width: obj.dimensions.width * CELL_SIZE - 2,
                height: obj.dimensions.depth * CELL_SIZE - 2,
                backgroundColor: getObjectColor(obj),
                opacity: pos.y === currentY ? 1 : 0.3,
              }}
              title={`${obj.type}${(obj as WorldObject & { name?: string }).name ? `: ${(obj as WorldObject & { name?: string }).name}` : ""} (${pos.x}, ${pos.y}, ${pos.z})`}
            >
              {obj.type === "player" && (
                <span className="player-label">
                  {(obj as WorldObject & { name?: string }).name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="game-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: COLORS.player }}></span>
          Player
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: COLORS.npc }}></span>
          NPC
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: COLORS.tree }}></span>
          Tree
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: COLORS.rock }}></span>
          Rock
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: COLORS.chest }}></span>
          Chest
        </div>
      </div>
    </div>
  );
}
