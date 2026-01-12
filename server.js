const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
require('dotenv').config();

// Import Passport configuration
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Chatz Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});



// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/NotificationRoute'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/rooms', require('./routes/room.route'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// MongoDB connection and start server
const startServer = async () => {
  try {
    // Kết nối đến MongoDB
    await connectDB();
    
    // Kết nối đến Redis
    try {
      await connectRedis();
    } catch (redisError) {
      console.warn('⚠️  Redis connection failed, queue features may not work:', redisError.message);
      console.warn('⚠️  Make sure Redis is running or set REDIS_URL in .env');
    }
    
    // Khởi động queue matcher (chạy mỗi 1 phút)
    const { startQueueMatcher } = require('./services/queueMatcher');
    startQueueMatcher(1);
    
    // Khởi động server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/users`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Khởi động server
startServer();

module.exports = app;
