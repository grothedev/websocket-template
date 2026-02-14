import { useState, type FormEvent } from "react";
import { useWebSocket } from "../hooks/useWebSocket.ts";
import { TodoItem } from "./TodoItem.tsx";

export function TodoList() {
  const { todos, connected, addTodo, removeTodo, toggleTodo } = useWebSocket();
  const [newTodoText, setNewTodoText] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = newTodoText.trim();
    if (text) {
      addTodo(text);
      setNewTodoText("");
    }
  };

  return (
    <div className="todo-list-container">
      <div className={`connection-status ${connected ? "connected" : "disconnected"}`}>
        {connected ? "Connected" : "Disconnected"}
      </div>

      <form onSubmit={handleSubmit} className="todo-form">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="Add a new todo..."
          className="todo-input"
        />
        <button type="submit" disabled={!connected}>
          Add
        </button>
      </form>

      <ul className="todo-list">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onRemove={removeTodo}
          />
        ))}
      </ul>

      {todos.length === 0 && (
        <p className="empty-message">No todos yet. Add one above!</p>
      )}
    </div>
  );
}
