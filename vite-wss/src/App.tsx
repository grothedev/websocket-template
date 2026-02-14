import { TodoList } from "./components/TodoList.tsx";
import "./App.css";

function App() {
  return (
    <>
      <h1>Collaborative Todo List</h1>
      <p className="subtitle">Real-time sync across all connected clients</p>
      <TodoList />
    </>
  );
}

export default App;
