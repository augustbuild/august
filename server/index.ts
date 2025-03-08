import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Startup diagnostics
log("Starting server...");
log(`Environment: ${process.env.NODE_ENV}`);
log(`Database URL present: ${!!process.env.DATABASE_URL}`);
log(`Stripe configuration: ${process.env.STRIPE_SECRET_KEY ? 'Available' : 'Not configured'}`);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Registering routes...");
    const server = await registerRoutes(app);

    // Global error handler - now logs errors without throwing
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    // Development vs Production setup
    if (app.get("env") === "development") {
      log("Setting up development environment with Vite...");
      await setupVite(app, server);
    } else {
      log("Setting up production environment...");
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server successfully started and listening on port ${port}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    // Log error but don't exit - let the process manager handle restarts if needed
    log("Server startup failed, but continuing to run for diagnostics");
  }
})();