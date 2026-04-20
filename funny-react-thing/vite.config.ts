import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "",
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  worker: {
    format: "es",
  },
  // build: {
  //   outDir: "../nobodynuf.github.io/wwwroot/funny-react-thing",
  //   emptyOutDir: true,
  // },
});
