// vite.config.ts
import { defineConfig } from "file:///C:/Users/bhuva/Desktop/finalchat/finalchat/intelli-call/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/bhuva/Desktop/finalchat/finalchat/intelli-call/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\bhuva\\Desktop\\finalchat\\finalchat\\intelli-call";
var vite_config_default = defineConfig({
  plugins: [react()],
  define: {
    "process.env.GEMINI_API_KEY": JSON.stringify(process.env.GEMINI_API_KEY || ""),
    "process.env.VITE_SERVER_URL": JSON.stringify(process.env.VITE_SERVER_URL || ""),
    "import.meta.env.VITE_SERVER_URL": JSON.stringify(process.env.VITE_SERVER_URL || "")
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    port: 3e3,
    proxy: {
      "/api": "http://localhost:3013",
      "/socket.io": {
        target: "http://localhost:3013",
        ws: true
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxiaHV2YVxcXFxEZXNrdG9wXFxcXGZpbmFsY2hhdFxcXFxmaW5hbGNoYXRcXFxcaW50ZWxsaS1jYWxsXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxiaHV2YVxcXFxEZXNrdG9wXFxcXGZpbmFsY2hhdFxcXFxmaW5hbGNoYXRcXFxcaW50ZWxsaS1jYWxsXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9iaHV2YS9EZXNrdG9wL2ZpbmFsY2hhdC9maW5hbGNoYXQvaW50ZWxsaS1jYWxsL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgZGVmaW5lOiB7XG4gICAgJ3Byb2Nlc3MuZW52LkdFTUlOSV9BUElfS0VZJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuR0VNSU5JX0FQSV9LRVkgfHwgJycpLFxuICAgICdwcm9jZXNzLmVudi5WSVRFX1NFUlZFUl9VUkwnOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5WSVRFX1NFUlZFUl9VUkwgfHwgJycpLFxuICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9TRVJWRVJfVVJMJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuVklURV9TRVJWRVJfVVJMIHx8ICcnKVxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6ICdodHRwOi8vbG9jYWxob3N0OjMwMTMnLFxuICAgICAgJy9zb2NrZXQuaW8nOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAxMycsXG4gICAgICAgIHdzOiB0cnVlLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxVyxTQUFTLG9CQUFvQjtBQUNsWSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDTiw4QkFBOEIsS0FBSyxVQUFVLFFBQVEsSUFBSSxrQkFBa0IsRUFBRTtBQUFBLElBQzdFLCtCQUErQixLQUFLLFVBQVUsUUFBUSxJQUFJLG1CQUFtQixFQUFFO0FBQUEsSUFDL0UsbUNBQW1DLEtBQUssVUFBVSxRQUFRLElBQUksbUJBQW1CLEVBQUU7QUFBQSxFQUNyRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBLEVBQ2Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLGNBQWM7QUFBQSxRQUNaLFFBQVE7QUFBQSxRQUNSLElBQUk7QUFBQSxNQUNOO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
