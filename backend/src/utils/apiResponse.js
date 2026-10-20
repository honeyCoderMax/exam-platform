const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const created = (res, data = null, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

const notFound = (res, message = 'Resource not found') => error(res, message, 404);
const unauthorized = (res, message = 'Unauthorized') => error(res, message, 401);
const forbidden = (res, message = 'Forbidden') => error(res, message, 403);
const badRequest = (res, message = 'Bad request', errors = null) => error(res, message, 400, errors);
const conflict = (res, message = 'Conflict') => error(res, message, 409);

module.exports = { success, created, error, notFound, unauthorized, forbidden, badRequest, conflict };
