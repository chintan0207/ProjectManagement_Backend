import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";
import logger from "./utils/logger.js";

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    app.listen(PORT, () => logger.info(`Server listening on ${PORT}`));
  })
  .catch((err) => {
    logger.error("MongoDb connection error", err);
  });
