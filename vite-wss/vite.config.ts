import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { wsPlugin } from "./src/server/ws-plugin.ts";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wsPlugin()],
});
