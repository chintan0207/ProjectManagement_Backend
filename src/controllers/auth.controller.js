import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendMail,
} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";

dotenv.config({
  path: "../.env",
});

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
    logger.error("Error generating access and refresh tokens:", error);
    throw new ApiError(500, "Something went wrong while generate access and refresh token");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  console.time("registerUserTotal");
  logger.info("Register user request received");

  console.time("validateInput");
  const { username, email, password, fullname } = req.body;

  if (!username || !email || !password || !fullname) {
    logger.warn("Missing required fields in registration");
    throw new ApiError(400, "All fields are required");
  }
  console.timeEnd("validateInput");

  console.time("checkExistingUser");
  const existUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existUser) {
    logger.warn("User already exists with given username or email");
    throw new ApiError(200, "User already exist");
  }
  console.timeEnd("checkExistingUser");

  console.time("avatarUpload");
  const avatarLocalPath = req.file?.path || null;
  let avatar = { localpath: "", url: "" };

  if (avatarLocalPath) {
    const uploaded = await uploadOnCloudinary(avatarLocalPath);
    if (uploaded?.url) {
      avatar = {
        localpath: avatarLocalPath,
        url: uploaded.url,
      };
    }
  }

  console.timeEnd("avatarUpload");

  console.time("createUser");
  const user = await User.create({
    username,
    email,
    password,
    fullname,
    avatar, // always has localpath and url keys
  });

  const createUser = await User.findById(user._id).select("username email fullname avatar");
  if (!createUser) {
    logger.error("Error fetching newly created user");
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  console.timeEnd("createUser");

  console.time("generateTokenAndSaveUser");
  const { hashedToken } = user.generateTemporaryToken();
  if (!hashedToken) {
    logger.error("Error generating verification token");
    throw new ApiError(500, "Something went wrong while generate token");
  }

  user.emailVerificationToken = hashedToken;
  await user.save();
  console.timeEnd("generateTokenAndSaveUser");

  console.time("sendVerificationEmail");
  await sendMail({
    email: user.email,
    subject: "Email Verification",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/auth/verify/${hashedToken}`,
    ),
  });
  console.timeEnd("sendVerificationEmail");

  logger.info(`User registered: ${user._id}`);
  console.timeEnd("registerUserTotal");

  res
    .status(200)
    .json(new ApiResponse(200, createUser, "User registered, check your email to verify"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  logger.info("Login request received");

  if (!email && !username) {
    logger.warn("Missing email or username in login");
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    logger.warn("Invalid login credentials - user not found");
    throw new ApiError(400, "Invalid user credentials");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    logger.warn("Invalid login credentials - wrong password");
    throw new ApiError(400, "Invalid user credentials");
  }

  if (!user.isEmailVerified) {
    logger.warn("User email not verified");
    throw new ApiError(400, "Please verify your email");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  logger.info(`User logged in: ${user._id}`);
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken, loggedInUser },
        "User logged in successfully",
      ),
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  logger.info(`User logged out: ${req.user._id}`);
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  logger.info("Email verification request received");

  if (!token) {
    logger.warn("Invalid token in email verification");
    throw new ApiError(400, "Invaid token");
  }

  const user = await User.findOne({ emailVerificationToken: token });
  if (!user) {
    logger.warn("Invalid token or user not found for verification");
    throw new ApiError(400, "Invalid token");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  logger.info(`Email verified for user: ${user._id}`);
  res.status(200).json(new ApiResponse(200, "Email verified"));
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    logger.warn("Email is missing in resend verification request");
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    logger.warn("User not found for resend verification");
    throw new ApiError(400, "Invalid email or user not found");
  }

  if (user.isEmailVerified) {
    logger.info("User already verified");
    throw new ApiError(400, "User already verified ");
  }

  const { hashedToken } = user.generateTemporaryToken();
  if (!hashedToken) {
    logger.error("Error generating token for resend verification");
    throw new ApiError(500, "Something went wrong while generate token");
  }

  user.emailVerificationToken = hashedToken;
  await user.save();

  await sendMail({
    email: user.email,
    subject: "Email Verification",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/auth/verify/${hashedToken}`,
    ),
  });

  logger.info(`Verification email resent to: ${email}`);
  res.status(200).json(new ApiResponse(200, {}, "Email sent successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    logger.warn("Missing refresh token in refresh request");
    throw new ApiError(400, "Unauthorized request ");
  }

  try {
    const decodeToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodeToken?._id);
    if (!user) {
      logger.warn("User not found for refresh token");
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      logger.warn("Refresh token mismatch");
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    logger.info(`Access token refreshed for user: ${user._id}`);
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed"));
  } catch (error) {
    logger.error("Refresh token error:", error);
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    logger.warn("Email is required for forgot password");
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    logger.warn("User not found for forgot password");
    throw new ApiError(400, "User not found");
  }

  const { hashedToken } = user.generateTemporaryToken();
  if (!hashedToken) {
    logger.error("Error generating token for forgot password");
    throw new ApiError(500, "Something went wrong while generate token");
  }

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendMail({
    email: user.email,
    subject: "Forgot Password",
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/auth/resetpassword/${hashedToken}`,
    ),
  });

  logger.info(`Forgot password email sent to: ${email}`);
  res.status(200).json(new ApiResponse(200, {}, "Email sent successfully"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params || req.body;

  if (!token) {
    logger.warn("Token missing in reset password");
    throw new ApiError(400, "token is required");
  }

  if (!password) {
    logger.warn("Password missing in reset password");
    throw new ApiError(400, "password is required");
  }

  const user = await User.findOne({
    forgotPasswordToken: token,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    logger.warn("Invalid or expired reset token");
    throw new ApiError(400, "your token is expired");
  }

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  user.password = password;

  await user.save();

  logger.info(`Password reset for user: ${user._id}`);
  res.status(200).json(new ApiResponse(200, {}, "Password update successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    logger.warn("Missing old or new password in change password request");
    throw new ApiError(400, "Both oldPassword and newPassword are required");
  }

  const user = await User.findOne({ _id: req.user._id });
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    logger.warn("Invalid old password");
    throw new ApiError(400, "Invalid password");
  }

  if (oldPassword === newPassword) {
    logger.warn("New password matches old password");
    throw new ApiError(400, "New password must be different ");
  }

  user.password = newPassword;
  await user.save();

  logger.info(`Password changed for user: ${req.user._id}`);
  res.status(200).json(new ApiResponse(200, {}, "password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  logger.info(`Get current user: ${req.user._id}`);
  return res.status(200).json(new ApiResponse(200, req.user, "Get user successfully"));
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
