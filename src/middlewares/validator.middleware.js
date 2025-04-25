import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  // console.log(errors);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedError = errors.array().map((err) => ({
    [err.path]: err.msg,
  }));

  return next(new ApiError(400, "Received data is not valid", extractedError));
};
