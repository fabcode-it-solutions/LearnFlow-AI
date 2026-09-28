import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

// ── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  ...(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Routes ──────────────────────────────────────────────────────────────────
import authRouter from "./routes/auth.routes.js";
import subjectRouter from "./routes/subject.routes.js";
import planRouter from "./routes/plan.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

app.use("/api/auth", authRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/plan", planRouter);
app.use("/api/dashboard", dashboardRouter);

// ── Health check & Root info ────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "LearnFlow AI",
    services: {
      api: "healthy",
      insightsEngine: "healthy",
      plannerAlgorithm: "v2.0-multi-subject",
    },
    time: new Date().toISOString(),
  });
});

app.get("/api/health/insights", (_req, res) => {
  res.json({
    status: "healthy",
    service: "AI Schedule Insights Engine",
    algorithm: "Priority Score = urgency × (6 − confidence) × topicWeight",
    version: "v2.0-multi-subject",
    multiSubjectPacing: true,
    time: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    app: "LearnFlow AI API",
    message: "Server is online. Web app running at http://localhost:5173",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      subjects: "/api/subjects",
      plan: "/api/plan",
      dashboard: "/api/dashboard",
    },
  });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.url} - Error:`, err);

  // MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || "field";
    const statusCode = 409;
    const message =
      field === "email"
        ? "An account with this email address already exists. Please log in instead."
        : `A record with this ${field} already exists.`;
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors: [{ field, message }],
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    const message = errors.map((e) => e.message).join(". ");
    return res.status(422).json({
      success: false,
      statusCode: 422,
      message: message || "Validation failed",
      errors,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Session expired or invalid. Please log in again.",
      errors: [],
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
  });
});

export default app;

