import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { emailVerificationMailgenContent, sendMail } from "../utils/mail.js";
import dotenv from "dotenv";

dotenv.config({
  path: "../.env",
});

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullname } = req.body;

  if (!username || !email || !password || !fullname) {
    throw new ApiError(400, "All fields are required");
  }

  const existUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existUser) {
    res.status(400).json(new ApiResponse(400, "User already exists"));
  }

  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    username,
    email,
    password,
    fullname,
    avatar: { localpath: avatarLocalPath },
  });

  const createUser = await User.findById(user._id).select("username email");
  if (!createUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  const { hashedToken } = user.generateTemporaryToken();
  if (!hashedToken) {
    throw new ApiError(500, "Something went wrong while generate token");
  }

  user.emailVerificationToken = hashedToken;
  await user.save();

  await sendMail({
    email: user.email,
    subject: "Email Veriyfication",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/auth/verify/${hashedToken}`,
    ),
  });

  res
    .status(200)
    .json(new ApiResponse(200, createUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const logOutUser = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token) {
    throw new ApiError(400, "Invaid token");
  }

  const user = await User.findOne({ emailVerificationToken: token });
  if (!user) {
    throw new ApiError(400, "Invalid token");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  res.status(200).json(new ApiResponse(200, "Email verified"));
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

export {
  registerUser,
  loginUser,
  logOutUser,
  verifyEmail,
  resendVerificationEmail,
  refreshAccessToken,
  forgotPasswordRequest,
  changeCurrentPassword,
  getCurrentUser,
};
