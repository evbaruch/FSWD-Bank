const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    const message = 'Referenced record does not exist';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    const message = 'Cannot delete record that is referenced by other records';
    error = { message, statusCode: 400 };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // Cast errors (MongoDB)
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = { message, statusCode: 400 };
  }

  // Rate limit errors
  if (err.status === 429) {
    const message = 'Too many requests';
    error = { message, statusCode: 429 };
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler }; 