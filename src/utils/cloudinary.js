import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const finalPath = path.resolve(localFilePath);
    // file uplod on cloudinary
    const response = await cloudinary.uploader.upload(finalPath, {
      resource_type: "auto",
    });
    // after upload on cloudinary remove from local
    // if (response) {
    //   fs.unlinkSync(finalPath);
    // }
    return response;
  } catch (error) {
    console.error("Error uploading to cloudinary:", error);
    // any error while file uploading then also remove from local
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }
    return null;
  }
};

export { uploadOnCloudinary };
