import { useWebSocket } from "./hooks/useWebSocket.ts";
import { JoinScreen } from "./components/JoinScreen.tsx";
import { GameWorld } from "./components/GameWorld.tsx";
import "./App.css";

function App() {
  const {
    connected,
    joined,
    playerId,
    world,
    error,
    join,
    leave,
    move,
    interact,
  } = useWebSocket();

  return (
    <div className="app">
      <h1>Game World</h1>

      {error && <div className="error-message">{error}</div>}

      {!joined ? (
        <JoinScreen connected={connected} onJoin={join} />
      ) : world && playerId ? (
        <GameWorld
          world={world}
          playerId={playerId}
          onMove={move}
          onInteract={interact}
          onLeave={leave}
        />
      ) : (
        <div className="loading">Loading world...</div>
      )}
    </div>
  );
}

export default App;
