import mongoose from "mongoose";
import { DB_NAME, GlobalRoleEnum } from "../utils/constant.js";
import logger from "../utils/logger.js";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js"; // adjust path if needed
import { AvailableGlobalRoles } from "../utils/constant.js";

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    logger.info(`✅ MongoDB connected: ${process.env.MONGO_URI}/${DB_NAME}`);

    // Bootstrap SuperAdmin if none exists
    const existingSuperAdmin = await User.findOne({
      globalRole: GlobalRoleEnum.SUPER_ADMIN,
    });


    if (!existingSuperAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10); // Default password

      await User.create({
        username: "superadmin",
        fullname: "Super Admin",
        email: "superadmin@pms.com",
        password: hashedPassword,
        globalRole: GlobalRoleEnum.SUPER_ADMIN,
        isEmailVerified: true,
        avatar: {
          url: `https://placehold.co/600x400`,
          localpath: "",
        },
      });

      logger.info("🚀 Default SuperAdmin user created: superadmin@pms.com / admin123");
    }
  } catch (error) {
    console.error("❌ MongoDB connection failed", error);
    process.exit(1);
  }
};

export default connectDB;
