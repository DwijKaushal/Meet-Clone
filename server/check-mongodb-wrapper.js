// Wrapper to run the repo-level check script using server's node_modules
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from repo root and server folder
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(__dirname, './.env') });

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
    if (collections.length === 0) {
      console.log('   (No collections yet - database is empty)');
    } else {
      collections.forEach(col => console.log(`   - ${col.name}`));
    }
    return mongoose.connection.db.stats();
  })
  .then(stats => {
    console.log('\n💾 Database Stats:');
    console.log(`   Name: ${stats.db}`);
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB`);
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
    console.log('   1. Make sure MongoDB (or your Atlas cluster) allows connections from your IP');
    console.log('   2. Check MONGODB_URI in .env file');
    console.log('   3. The app works without MongoDB (in-memory mode)');
    process.exit(1);
  });
