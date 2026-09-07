import { useState, type FormEvent } from "react";

interface JoinScreenProps {
  connected: boolean;
  onJoin: (name: string) => void;
}

export function JoinScreen({ connected, onJoin }: JoinScreenProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onJoin(trimmed);
    }
  };

  return (
    <div className="join-screen">
      <h2>Join World</h2>
      <div className={`connection-status ${connected ? "connected" : "disconnected"}`}>
        {connected ? "Connected" : "Connecting..."}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          disabled={!connected}
          autoFocus
        />
        <button type="submit" disabled={!connected || !name.trim()}>
          Join
        </button>
      </form>
    </div>
  );
}
