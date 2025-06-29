import mongoose from "mongoose";
import { DB_NAME } from "../utils/constant.js";
import logger from "../utils/logger.js";

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    logger.info(`MongoDB connected ${process.env.MONGO_URI}/${DB_NAME}`);
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  }
};

export default connectDB;
