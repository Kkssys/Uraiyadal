require('dotenv').config();
const mongoose = require('mongoose');

async function updateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Update all users to add missing fields
    const result = await db.collection('users').updateMany(
      {}, 
      { 
        $set: { 
          friends: [], 
          friendRequests: [], 
          notifications: [] 
        } 
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users`);
    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateUsers();