import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Docker では API_PROXY=http://api:8080、ローカル単体起動では localhost にフォールバック。
const apiTarget = process.env.API_PROXY ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    // /api/* を API サーバへプロキシし、CORS を気にせず開発できるようにする。
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
