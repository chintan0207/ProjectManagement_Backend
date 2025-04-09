import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(
  cors({
    origin: process.env.BASE_URL,
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import heathCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";

app.use("/api/v1/healthcheck", heathCheckRouter);
app.use("/api/v1/auth", authRouter);

export default app;
