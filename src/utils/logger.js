// logger.js
import { createLogger, format, transports, config } from "winston";
import winston from "winston";
import fs from "fs";
import path from "path";

// Ensure logs directory exists
const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Custom level colors
const colors = {
  info: "blue",
  warn: "yellow",
  error: "red",
  http: "cyan",
  debug: "gray",
};

winston.addColors(colors);

const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`),
);

const fileFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf((info) => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`),
);

const logger = createLogger({
  level: "info",
  levels: config.npm.levels,
  transports: [
    new transports.Console({
      format: consoleFormat,
    }),
    new transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: fileFormat,
    }),
    new transports.File({
      filename: path.join(logDir, "combined.log"),
      format: fileFormat,
    }),
  ],
});

export default logger;
