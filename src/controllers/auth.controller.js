import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { emailVerificationMailgenContent, sendMail } from "../utils/mail.js";
import dotenv from "dotenv";

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

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generate access and refresh token",
    );
  }
};

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
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "Invaild user credentials");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(400, "Invaild user credentials");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(400, "Please verify your email");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  const loggedInUser = await User.findOne(user._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

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

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
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
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "Invaild email or user not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "User already verified ");
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

  res.status(200).json(new ApiResponse(200, {}, "Email sent successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const resetPassword = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both oldPassword and newPassword are required");
  }

  const user = await User.findOne({ _id: req.user._id });

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(400, "Invaild password");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different ");
  }

  user.password = newPassword;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Get user successfully"));
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
