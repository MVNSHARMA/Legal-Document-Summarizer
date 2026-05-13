import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    define: {
      __API_URL__: JSON.stringify(
        env.VITE_API_URL || "https://lexanalyze-backend.onrender.com"
      ),
    },
    server: {
      port: 5173,
    },
  };
});
