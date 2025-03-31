import { asyncHandler } from "../utils/async-handler.js";

const registerUser = asyncHandler(async (req, res) => {
  
  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

export { registerUser };
