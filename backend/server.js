/**
 * Portfolio Website Backend Server
 * Express.js server with MongoDB integration and Cloudflare R2 storage
 * Author: Pranav Badgi
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const projectRoutes = require('./routes/projects');
const blogRoutes = require('./routes/blog');
const youtubeRoutes = require('./routes/youtube');
const contactRoutes = require('./routes/contact');
const uploadRoutes = require('./routes/upload');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// ==============================================
// Security Middleware
// ==============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'self'", "https://www.youtube.com"]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, file://, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'https://itspranavbadgi.com',
      'https://www.itspranavbadgi.com',
      'https://pranavbadgi.com',
      'https://www.pranavbadgi.com'
    ];
    
    // Allow local file access and localhost variations for development
    if (process.env.NODE_ENV === 'development' || 
        origin === 'null' || 
        origin.startsWith('file://') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Contact form specific rate limiting
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 contact form submissions per hour
  message: {
    error: 'Too many contact form submissions, please try again later'
  }
});

app.use('/api/contact', contactLimiter);

// ==============================================
// General Middleware
// ==============================================

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ==============================================
// API Routes
// ==============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/projects', projectRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/upload', uploadRoutes);

// ==============================================
// Frontend Routes (SPA Support)
// ==============================================

// Serve index.html for all non-API routes (SPA routing)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==============================================
// Error Handling
// ==============================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// ==============================================
// Server Startup
// ==============================================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log(`
🚀 Portfolio Backend Server Started!
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://${HOST}:${PORT}
📚 API Docs: http://${HOST}:${PORT}/api/health
⏰ Started at: ${new Date().toLocaleString()}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;