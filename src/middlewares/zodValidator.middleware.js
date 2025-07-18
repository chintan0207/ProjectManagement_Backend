export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  console.log("result", result);

  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message).join(", ");
    console.log("errors", errors);
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: errors,
      data: {},
    });
  }

  req.validatedData = result.data;
  next();
};
