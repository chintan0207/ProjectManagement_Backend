import multer from "multer";
import { allowedMimeTypes } from "../utils/constant.js";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname); // get file extension
    cb(null, file.fieldname + "-" + uniqueSuffix + ext); // append extension
  },
});

export const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 1 * 1000 * 1000,
  },
});

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError("Unsupported file type", 500));
  }
};

export const uploadTaskAttachments = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10000 * 1024 * 1024 },
}).array("attachments", 5);
