const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// PORT must be set by deployment platform (e.g., Railway, Render, etc.)
// Default to 5000 for local development
const PORT = process.env.PORT || 5000;

// Ensure PORT is a number
const portNumber = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

if (!portNumber || isNaN(portNumber)) {
  console.error('❌ Invalid PORT:', PORT);
  process.exit(1);
}

// Security middleware - Configure helmet to allow CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - Handle preflight requests properly
const allowedOrigins = process.env.FRONTEND_URL?.split(',').map(url => url.trim()) || ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
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

// Health check route (required for deployment platforms)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

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
app.use('/api/chat', require('./routes/chat'));

// Socket.IO middleware và handlers
const socketAuth = require('./middleware/socketAuth');
const chatSocketHandler = require('./services/chatSocketHandler');

io.use(socketAuth);

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.userId}`);
  
  chatSocketHandler(io, socket);
  
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
  });
});

// Export io để sử dụng trong các routes khác
app.set('io', io);

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
    
    // Kết nối đến Upstash Redis
    try {
      await connectRedis();
    } catch (redisError) {
      console.warn('⚠️  Upstash Redis connection failed, queue features may not work:', redisError.message);
      console.warn('⚠️  Make sure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set in .env');
    }
    
    // Khởi động queue matcher (chạy mỗi 1 phút)
    const { startQueueMatcher } = require('./services/queueMatcher');
    startQueueMatcher(1);
    
    // Khởi động server với Socket.IO
    // Bind to 0.0.0.0 to accept connections from all network interfaces (required for deployment)
    server.listen(portNumber, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${portNumber}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Health check: http://0.0.0.0:${portNumber}/health`);
      console.log(`🔌 Socket.IO server is ready`);
      console.log(`📡 Listening on 0.0.0.0:${portNumber}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Khởi động server
startServer();

module.exports = app;
