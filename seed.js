/**
 * seed.js — Run once to create an admin account
 * Usage: node seed.js
 */
const mongoose = require('mongoose');
const User     = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/votebox';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: 'admin@votebox.com' });
  if (existing) {
    console.log('✅  Admin already exists: admin@votebox.com');
    process.exit(0);
  }

  await User.create({
    name:     'Admin',
    email:    'admin@votebox.com',
    password: 'admin123',
    isAdmin:  true
  });

  console.log('🎉  Admin user created!');
  console.log('    Email:    admin@votebox.com');
  console.log('    Password: admin123');
  console.log('    ⚠️  Change this password after first login!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
