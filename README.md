# Chatz Backend API

Backend API cho ứng dụng chat real-time được xây dựng với Express.js.

## 🚀 Tính năng

- **Authentication**: Đăng ký, đăng nhập, đăng xuất
- **User Management**: Quản lý thông tin người dùng
- **Chat System**: Tạo phòng chat, gửi tin nhắn
- **Security**: Helmet, CORS, Rate limiting
- **Logging**: Morgan logging
- **Error Handling**: Xử lý lỗi toàn diện

## 📋 Yêu cầu hệ thống

- Node.js >= 14.0.0
- npm >= 6.0.0

## 🛠️ Cài đặt

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd chatz-be
   ```

2. **Cài đặt dependencies**
   ```bash
   npm install
   ```

3. **Tạo file environment**
   ```bash
   cp .env.example .env
   ```

4. **Cấu hình environment variables**
   Chỉnh sửa file `.env` với các giá trị phù hợp:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

## 🚀 Chạy ứng dụng

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất

### Users
- `GET /api/users/profile` - Lấy thông tin profile
- `PUT /api/users/profile` - Cập nhật profile
- `GET /api/users` - Lấy danh sách users

### Chat
- `GET /api/chat/rooms` - Lấy danh sách phòng chat
- `POST /api/chat/rooms` - Tạo phòng chat mới
- `GET /api/chat/rooms/:roomId/messages` - Lấy tin nhắn trong phòng
- `POST /api/chat/rooms/:roomId/messages` - Gửi tin nhắn

### System
- `GET /` - Thông tin API
- `GET /health` - Health check

## 🔧 Cấu trúc project

```
chatz-be/
├── server.js              # File chính của server
├── package.json           # Dependencies và scripts
├── .env.example          # Template cho environment variables
├── .gitignore            # Git ignore rules
├── README.md             # Documentation
├── routes/               # API routes
│   ├── auth.js          # Authentication routes
│   ├── users.js         # User management routes
│   └── chat.js          # Chat system routes
└── middleware/           # Custom middleware
    ├── auth.js          # Authentication middleware
    └── validation.js    # Validation middleware
```

## 🔒 Security Features

- **Helmet**: Bảo vệ HTTP headers
- **CORS**: Kiểm soát cross-origin requests
- **Rate Limiting**: Giới hạn số request
- **Input Validation**: Kiểm tra dữ liệu đầu vào
- **Error Handling**: Xử lý lỗi an toàn

## 🧪 Testing

```bash
# Chạy tests (sẽ được implement sau)
npm test
```

## 📝 Development Notes

### TODO List
- [ ] Implement database integration (MongoDB/PostgreSQL)
- [ ] Add JWT authentication
- [ ] Implement WebSocket cho real-time chat
- [ ] Add file upload functionality
- [ ] Implement user roles và permissions
- [ ] Add comprehensive testing
- [ ] Add API documentation (Swagger)
- [ ] Implement caching (Redis)
- [ ] Add monitoring và logging

### Environment Variables
Tạo file `.env` từ `.env.example` và cấu hình:

```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

Distributed under the ISC License. See `LICENSE` for more information.

## 📞 Support

Nếu có vấn đề, hãy tạo issue hoặc liên hệ qua email.
