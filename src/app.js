import express from "express";

const app = express();

import heathCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";

app.use("/api/v1/healthcheck", heathCheckRouter);
app.use("/api/v1/auth", authRouter);

export default app;
