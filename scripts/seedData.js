const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { connectDB } = require('../config/database');
require('dotenv').config();

// Import models
const User = require('../models/User');

/**
 * Tạo dữ liệu mẫu cho User
 */
const createSampleUsers = async () => {
  try {
    console.log('🌱 Bắt đầu tạo dữ liệu mẫu...');

    // Xóa dữ liệu cũ (tùy chọn)
    await User.deleteMany({});
    console.log('🗑️ Đã xóa dữ liệu cũ');

    // Tạo password hash
    const saltRounds = 12;
    const passwordHash1 = await bcrypt.hash('password123', saltRounds);
    const passwordHash2 = await bcrypt.hash('password456', saltRounds);
    const passwordHash3 = await bcrypt.hash('password789', saltRounds);

    // Dữ liệu mẫu
    const sampleUsers = [
      {
        username: 'alice_wonder',
        email: 'alice@example.com',
        passwordHash: passwordHash1,
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        gender: 'female',
        age: 25,
        interests: ['photography', 'travel', 'music', 'cooking'],
        bio: 'Love traveling and taking photos! 📸✈️ Looking for meaningful connections.',
        locale: 'en-US',
        settings: {
          matchPreferences: {
            ageRange: { min: 22, max: 30 },
            genders: 'male',
            locales: ['en-US', 'vi-VN'],
            interests: ['travel', 'photography', 'music']
          }
        },
        lastActiveAt: new Date()
      },
      {
        username: 'bob_adventurer',
        email: 'bob@example.com',
        passwordHash: passwordHash2,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        gender: 'male',
        age: 28,
        interests: ['hiking', 'gaming', 'technology', 'coffee'],
        bio: 'Tech enthusiast and outdoor lover! 🏔️💻 Always up for new adventures.',
        locale: 'en-US',
        settings: {
          matchPreferences: {
            ageRange: { min: 23, max: 32 },
            genders: 'female',
            locales: ['en-US'],
            interests: ['travel', 'technology', 'hiking']
          }
        },
        lastActiveAt: new Date()
      },
      {
        username: 'charlie_music',
        email: 'charlie@example.com',
        passwordHash: passwordHash3,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        gender: 'male',
        age: 30,
        interests: ['music', 'art', 'books', 'wine'],
        bio: 'Musician and artist at heart 🎵🎨 Love deep conversations and good wine.',
        locale: 'en-US',
        settings: {
          matchPreferences: {
            ageRange: { min: 25, max: 35 },
            genders: 'female',
            locales: ['en-US', 'fr-FR'],
            interests: ['music', 'art', 'books']
          }
        },
        lastActiveAt: new Date()
      },
      {
        username: 'diana_fitness',
        email: 'diana@example.com',
        passwordHash: await bcrypt.hash('password101', saltRounds),
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        gender: 'female',
        age: 26,
        interests: ['fitness', 'yoga', 'healthy_living', 'dogs'],
        bio: 'Fitness enthusiast and dog lover! 🐕💪 Living a healthy and active lifestyle.',
        locale: 'en-US',
        settings: {
          matchPreferences: {
            ageRange: { min: 24, max: 32 },
            genders: 'male',
            locales: ['en-US'],
            interests: ['fitness', 'healthy_living', 'dogs']
          }
        },
        lastActiveAt: new Date()
      },
      {
        username: 'eve_creative',
        email: 'eve@example.com',
        passwordHash: await bcrypt.hash('password202', saltRounds),
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        gender: 'female',
        age: 24,
        interests: ['art', 'design', 'fashion', 'photography'],
        bio: 'Creative soul with a passion for design and art! 🎨✨ Always inspired by beauty.',
        locale: 'en-US',
        settings: {
          matchPreferences: {
            ageRange: { min: 22, max: 30 },
            genders: 'male',
            locales: ['en-US', 'es-ES'],
            interests: ['art', 'photography', 'design']
          }
        },
        lastActiveAt: new Date()
      }
    ];

    // Thêm dữ liệu vào database
    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Đã tạo ${createdUsers.length} users thành công!`);

    // Hiển thị thông tin users đã tạo
    console.log('\n📋 Danh sách users đã tạo:');
    createdUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - ${user.gender}, ${user.age} tuổi`);
    });

    return createdUsers;
  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu mẫu:', error);
    throw error;
  }
};

/**
 * Hàm chính để chạy seed data
 */
const runSeed = async () => {
  try {
    // Kết nối database
    await connectDB();
    console.log('🔗 Đã kết nối MongoDB');

    // Tạo dữ liệu mẫu
    await createSampleUsers();

    console.log('\n🎉 Hoàn thành seed data!');
    console.log('💡 Bạn có thể sử dụng các tài khoản sau để test:');
    console.log('   - alice@example.com / password123');
    console.log('   - bob@example.com / password456');
    console.log('   - charlie@example.com / password789');
    console.log('   - diana@example.com / password101');
    console.log('   - eve@example.com / password202');

    // Đóng kết nối
    await mongoose.connection.close();
    console.log('🔒 Đã đóng kết nối MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi trong quá trình seed:', error);
    process.exit(1);
  }
};

// Chạy seed nếu file được gọi trực tiếp
if (require.main === module) {
  runSeed();
}

module.exports = { createSampleUsers, runSeed };
