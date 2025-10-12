/**
 * Global Error Handler Middleware
 * Centralized error handling for the Express application
 */

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('\n--- Error Handler ---');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('--- End Error ---\n');

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      message,
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      message,
      statusCode: 401
    };
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = {
      message,
      statusCode: 400
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files uploaded';
    error = {
      message,
      statusCode: 400
    };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = {
      message,
      statusCode: 429
    };
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    const message = 'Cross-origin request blocked';
    error = {
      message,
      statusCode: 403
    };
  }

  // Database connection errors
  if (err.name === 'MongooseError' || err.name === 'MongoError') {
    const message = 'Database connection error';
    error = {
      message,
      statusCode: 500
    };
  }

  // Network/timeout errors
  if (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    const message = 'Network error, please try again';
    error = {
      message,
      statusCode: 503
    };
  }

  // Email errors
  if (err.code === 'EAUTH') {
    const message = 'Email authentication failed';
    error = {
      message,
      statusCode: 500
    };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Prepare error response
  const errorResponse = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        statusCode
      }
    })
  };

  // Add request info in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);

  // Log to external service in production (e.g., Sentry, LogRocket)
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(err);
  }
};

module.exports = errorHandler;