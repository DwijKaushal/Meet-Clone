// Quick MongoDB connection test
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/webrtc-conferencing';

console.log('Testing MongoDB connection...');
console.log('URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Hide password

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully!');
    return mongoose.connection.db.listCollections().toArray();
  })
  .then(collections => {
    console.log('\n📊 Collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    if (collections.length === 0) {
      console.log('   (No collections yet - database is empty)');
    }
    return mongoose.disconnect();
  })
  .then(() => {
    console.log('\n✅ Test complete - MongoDB is working!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    console.log('\n💡 Solutions:');
    console.log('   1. Make sure MongoDB is installed and running');
    console.log('   2. Check MONGODB_URI in .env file');
    console.log('   3. The app works without MongoDB (in-memory mode)');
    process.exit(1);
  });
