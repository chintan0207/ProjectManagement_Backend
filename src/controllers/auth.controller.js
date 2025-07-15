// controllers/auth.controller.js
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import logger from "../utils/logger.js";
import { emailQueue } from "../../queues/emailQueue.js";
import { AvailableGlobalRoles } from "../utils/constant.js";

dotenv.config({ path: "../.env" });

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    logger.info(`Generated access and refresh tokens for user: ${userId}`);
    return { accessToken, refreshToken };
  } catch (error) {
    logger.error("Error generating tokens:", error);
    throw new ApiError(500, "Failed to generate tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullname } = req.body;

  if (!username || !email || !password || !fullname) {
    throw new ApiError(400, "All fields are required");
  }

  const existUser = await User.findOne({
    $or: [{ username }, { email }],
    isDeleted: false,
  });

  if (existUser) {
    throw new ApiError(409, "User already exists");
  }

  const avatarLocalPath = req.file?.path || null;
  const avatar = avatarLocalPath ? { localpath: avatarLocalPath, url: "" } : null;

  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password,
    fullname,
    globalRole: AvailableGlobalRoles.USER,
    avatar,
  });

  const { hashedToken } = user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  await user.save();

  await emailQueue.add("sendVerificationEmail", {
    type: "email-verification",
    email: user.email,
    username: user.username,
    subject: "Email Verification",
    verificationLink: `${process.env.BASE_URL}/verify/${hashedToken}`,
  });

  const responseUser = await User.findById(user._id).select("username email fullname avatar");

  res.status(200).json(new ApiResponse(200, responseUser, "User registered, check email"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
    isDeleted: false,
  });

  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(400, "Invalid credentials");
  }

  if (!user.isEmailVerified) {
    return res.status(200).json(
      new ApiResponse(403, null, "Email not verified", {
        isEmailVerified: false,
      }),
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = { httpOnly: true, secure: true };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, { accessToken, refreshToken, loggedInUser }, "Login successful"));
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
  const options = { httpOnly: true, secure: true };
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logged out"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    emailVerificationToken: token,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired token");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;

  await user.save();
  res.status(200).json(new ApiResponse(200, {}, "Email verified"));
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email, isDeleted: false });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Already verified");
  }

  const { hashedToken } = user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;

  await user.save();

  await emailQueue.add("sendVerificationEmail", {
    type: "email-verification",
    email: user.email,
    username: user.username,
    subject: "Email Verification",
    verificationLink: `${process.env.BASE_URL}/verify/${hashedToken}`,
  });

  res.status(200).json(new ApiResponse(200, {}, "Email sent"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(400, "Unauthorized");

  try {
    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded._id);
    if (!user || incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const options = { httpOnly: true, secure: true };
    res
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken }, "Token refreshed"));
  } catch (err) {
    throw new ApiError(401, err.message || "Invalid refresh token");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email, isDeleted: false });
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const { hashedToken } = user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await user.save();

  await emailQueue.add("sendForgotPasswordEmail", {
    type: "forgot-password",
    email: user.email,
    username: user.username,
    subject: "Forgot Password",
    resetLink: `${process.env.BASE_URL}/resetpassword/${hashedToken}`,
  });

  res.status(200).json(new ApiResponse(200, {}, "Email sent"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params || req.body;

  const user = await User.findOne({
    forgotPasswordToken: token,
    forgotPasswordExpiry: { $gt: Date.now() },
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(400, "Token expired");
  }

  user.password = password;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  await user.save();
  res.status(200).json(new ApiResponse(200, {}, "Password updated"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user || !(await user.isPasswordCorrect(oldPassword))) {
    throw new ApiError(400, "Invalid old password");
  }
  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different");
  }

  user.password = newPassword;
  await user.save();
  res.status(200).json(new ApiResponse(200, {}, "Password changed"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(new ApiResponse(200, user, "User fetched"));
});

export {
  registerUser,
  loginUser,
  logOutUser,
  verifyEmail,
  resendVerificationEmail,
  refreshAccessToken,
  forgotPasswordRequest,
  resetPassword,
  changeCurrentPassword,
  getCurrentUser,
};
