import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import heathCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";
import projectNoteRouter from "./routes/note.routes.js";
import taskRouter from "./routes/task.routes.js";

import { globalErrorHandler } from "./utils/global-error-handler.js";

app.use("/api/v1/healthcheck", heathCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/project", projectRouter);
app.use("/api/v1/note", projectNoteRouter);
app.use("/api/v1/task", taskRouter);

app.use(globalErrorHandler);

export default app;
