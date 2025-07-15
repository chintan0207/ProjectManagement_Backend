import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { globalErrorHandler } from "./utils/global-error-handler.js";

const app = express();

const allowedOrigins = ["http://localhost:5173", "https://projectbuild.live"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import organizationRouter from "./routes/organization.routes.js";
import projectRouter from "./routes/project.routes.js";
import taskRouter from "./routes/task.routes.js";
import subTaskRouter from "./routes/subtask.routes.js";
import noteRouter from "./routes/projectNote.routes.js";
import kanbanRouter from "./routes/kanban.routes.js";
import chatRouter from "./routes/chat.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import activityLogRouter from "./routes/activityLog.routes.js";

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/organizations", organizationRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/subtasks", subTaskRouter);
app.use("/api/v1/notes", noteRouter);
app.use("/api/v1/kanban", kanbanRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/activity-logs", activityLogRouter);

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(globalErrorHandler);

export default app;
