const mongoose = require('mongoose');

/**
 * Kết nối đến MongoDB database
 * @param {string} uri - MongoDB connection string
 * @param {object} options - Mongoose connection options
 * @returns {Promise} - Promise của kết nối
 */
const connectDB = async (uri = null, options = {}) => {
  try {
    // Sử dụng URI từ parameter hoặc từ environment variable
    const mongoUri = uri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatz';
    
    // Cấu hình mặc định cho kết nối
    const defaultOptions = {
      serverSelectionTimeoutMS: 10000, // 10 giây timeout
      socketTimeoutMS: 45000, // 45 giây socket timeout
      bufferCommands: false, // Tắt buffer commands
      maxPoolSize: 10, // Số lượng kết nối tối đa trong pool
      minPoolSize: 5, // Số lượng kết nối tối thiểu trong pool
      maxIdleTimeMS: 30000, // 30 giây idle time
      ...options // Merge với options được truyền vào
    };

    // Cấu hình strict mode
    mongoose.set('strictQuery', true);

    // Kết nối đến database
    const connection = await mongoose.connect(mongoUri, defaultOptions);

    console.log(`✅ Connected to MongoDB: ${connection.connection.host}:${connection.connection.port}`);
    console.log(`📊 Database: ${connection.connection.name}`);
    
    // Xử lý sự kiện kết nối
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔴 Mongoose disconnected from MongoDB');
    });

    // Xử lý tắt ứng dụng
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🔒 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

/**
 * Ngắt kết nối MongoDB
 * @returns {Promise} - Promise của việc ngắt kết nối
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    throw error;
  }
};

/**
 * Kiểm tra trạng thái kết nối
 * @returns {string} - Trạng thái kết nối
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return states[mongoose.connection.readyState] || 'unknown';
};

/**
 * Lấy thông tin kết nối
 * @returns {object} - Thông tin kết nối
 */
const getConnectionInfo = () => {
  const connection = mongoose.connection;
  return {
    status: getConnectionStatus(),
    host: connection.host,
    port: connection.port,
    name: connection.name,
    readyState: connection.readyState
  };
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  getConnectionInfo
};
