/**
 * Admin Authentication Middleware
 * Simple authentication for admin routes
 */

/**
 * Simple admin authentication middleware
 * For production, you would implement JWT or session-based authentication
 * For now, we'll use a simple API key approach
 */
const adminAuth = (req, res, next) => {
  // Check for admin API key in headers
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_API_KEY || 'admin123'; // Should be set in environment
  
  // Skip auth for GET requests (public access)
  if (req.method === 'GET') {
    return next();
  }
  
  // Check if admin key is provided and correct
  if (!adminKey) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required. Please provide X-Admin-Key header.'
    });
  }
  
  if (adminKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid admin credentials.'
    });
  }
  
  // Admin authenticated, proceed
  next();
};

/**
 * Strict admin authentication (applies to all methods including GET)
 * Use this for truly sensitive admin-only endpoints
 */
const strictAdminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_API_KEY || 'admin123';
  
  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required.'
    });
  }
  
  next();
};

/**
 * Rate limiting for admin endpoints
 * Prevents brute force attacks on admin routes
 */
const adminRateLimit = (req, res, next) => {
  // Simple rate limiting - in production use redis or similar
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10; // Max 10 admin requests per 15 minutes per IP
  
  // Initialize rate limit store (in production, use Redis)
  if (!global.adminRateLimit) {
    global.adminRateLimit = new Map();
  }
  
  const key = `admin:${clientIP}`;
  const current = global.adminRateLimit.get(key) || { count: 0, resetTime: now + windowMs };
  
  // Reset if window has passed
  if (now > current.resetTime) {
    current.count = 0;
    current.resetTime = now + windowMs;
  }
  
  // Check if limit exceeded
  if (current.count >= maxAttempts) {
    return res.status(429).json({
      success: false,
      message: 'Too many admin requests. Please try again later.',
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    });
  }
  
  // Increment counter
  current.count++;
  global.adminRateLimit.set(key, current);
  
  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': maxAttempts,
    'X-RateLimit-Remaining': Math.max(0, maxAttempts - current.count),
    'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
  });
  
  next();
};

/**
 * CORS configuration for admin endpoints
 * Restricts admin access to specific origins
 */
const adminCors = (req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://itspranavbadgi.com'
  ];
  
  const origin = req.headers.origin;
  
  // Allow requests from allowed origins or no origin (direct API calls)
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Admin-Key');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

/**
 * Combined admin middleware stack
 * Combines CORS, rate limiting, and authentication
 */
const adminMiddleware = [
  adminCors,
  adminRateLimit,
  adminAuth
];

/**
 * Security headers for admin endpoints
 */
const adminSecurityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
};

/**
 * Audit logging for admin actions
 */
const adminAuditLog = (req, res, next) => {
  // Skip logging for GET requests
  if (req.method === 'GET') {
    return next();
  }
  
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    body: req.method !== 'DELETE' ? req.body : undefined
  };
  
  // In production, you would log this to a proper logging service
  console.log('ADMIN ACTION:', JSON.stringify(logData, null, 2));
  
  next();
};

module.exports = {
  adminAuth,
  strictAdminAuth,
  adminRateLimit,
  adminCors,
  adminMiddleware,
  adminSecurityHeaders,
  adminAuditLog
};