import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables with override enabled to prioritize local config over cached environment variables
dotenv.config({ override: true });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware to parse body payloads
  app.use(express.json());

  // 1. Api Endpoint: Connection Status
  app.get("/api/connection-status", (req, res) => {
    res.json({
      connected: !!process.env.APPS_SCRIPT_URL
    });
  });

  // 2. Api Endpoint: Google Apps Script Secured Backend Proxy
  app.post("/api/apps-script", async (req, res) => {
    const url = process.env.APPS_SCRIPT_URL;
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Google Apps Script URL is not configured on the backend server."
      });
    }

    const { action, data } = req.body;

    try {
      // Using text/plain prevents CORS preflight OPTIONS requests, matching client behavior
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({ action, data })
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: `HTTP error from Apps Script! Status: ${response.status}`
        });
      }

      const json = await response.json();
      return res.json(json);
    } catch (error: any) {
      console.error("Backend Apps Script proxy error:", error);
      return res.status(500).json({
        success: false,
        error: `Backend Proxy Error: ${error.message || error}`
      });
    }
  });

  // 3. Vite development middleware / Production static assets serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
