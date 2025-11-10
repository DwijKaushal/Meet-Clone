# Database Setup Guide

## Database Overview

This application uses **MongoDB** for storing:
- **Rooms** - Conference room information
- **Participants** - User participation records
- **CallStats** - Call statistics (duration, bitrate, etc.)

## Important: Database is Optional!

✅ **The application works WITHOUT MongoDB!**

The app operates in "in-memory" mode when MongoDB is not available:
- Rooms work (just not persisted)
- WebRTC connections work perfectly
- Only persistence/statistics are disabled

## Database Schema

### 1. Room Collection
```javascript
{
  roomId: String (unique, indexed),
  name: String,
  createdBy: String,
  createdAt: Date,
  expiresAt: Date (auto-expires after 24h),
  isActive: Boolean
}
```

### 2. Participant Collection
```javascript
{
  participantId: String (unique, indexed),
  roomId: String (indexed),
  userId: String,
  displayName: String,
  joinedAt: Date,
  leftAt: Date,
  isActive: Boolean
}
```

### 3. CallStat Collection
```javascript
{
  roomId: String (indexed),
  participantId: String,
  joinTime: Date,
  leaveTime: Date,
  duration: Number (seconds),
  bitrate: {
    video: Number,
    audio: Number
  },
  packetLoss: Number
}
```

## Installing MongoDB

### macOS (using Homebrew)
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Or run manually
mongod --config /opt/homebrew/etc/mongod.conf
```

### Linux (Ubuntu/Debian)
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Windows
1. Download MongoDB from: https://www.mongodb.com/try/download/community
2. Run the installer
3. MongoDB will start as a Windows service automatically

### Docker (Cross-platform)
```bash
# Run MongoDB in Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest

# To stop
docker stop mongodb

# To start again
docker start mongodb
```

## Configuration

### 1. Update `.env` file in root directory:
```env
MONGODB_URI=mongodb://localhost:27017/webrtc-conferencing
```

### 2. For remote MongoDB (MongoDB Atlas):
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/webrtc-conferencing
```

### 3. For Docker MongoDB:
```env
MONGODB_URI=mongodb://localhost:27017/webrtc-conferencing
```

## Verify MongoDB is Running

```bash
# Check if MongoDB is running
mongosh --eval "db.version()"

# Or using mongo CLI (older versions)
mongo --eval "db.version()"

# Check connection from Node.js
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/webrtc-conferencing').then(() => console.log('Connected!')).catch(e => console.error(e))"
```

## Seed the Database (Optional)

Create sample rooms:

```bash
cd server
node ../scripts/seed.js
```

This creates two demo rooms:
- `demo-room-1` - Demo Room 1
- `demo-room-2` - Demo Room 2

## Using MongoDB Compass (GUI)

1. Download from: https://www.mongodb.com/products/compass
2. Connect to: `mongodb://localhost:27017`
3. Navigate to `webrtc-conferencing` database
4. View collections: `rooms`, `participants`, `callstats`

## MongoDB Commands (Command Line)

```bash
# Connect to MongoDB shell
mongosh

# Or for older versions
mongo

# Then in MongoDB shell:
use webrtc-conferencing
db.rooms.find()
db.participants.find()
db.callstats.find()

# Count documents
db.rooms.countDocuments()
db.participants.countDocuments()
db.callstats.countDocuments()

# Find specific room
db.rooms.findOne({ roomId: "demo-room-1" })

# Find active participants
db.participants.find({ isActive: true })

# Find call stats for a room
db.callstats.find({ roomId: "demo-room-1" })
```

## Database Maintenance

### Clear All Data
```bash
mongosh webrtc-conferencing --eval "db.dropDatabase()"
```

### Remove Expired Rooms
```bash
mongosh webrtc-conferencing --eval "db.rooms.deleteMany({ expiresAt: { \$lt: new Date() } })"
```

### Export Data
```bash
mongoexport --db=webrtc-conferencing --collection=rooms --out=rooms.json
mongoexport --db=webrtc-conferencing --collection=participants --out=participants.json
mongoexport --db=webrtc-conferencing --collection=callstats --out=callstats.json
```

### Import Data
```bash
mongoimport --db=webrtc-conferencing --collection=rooms --file=rooms.json
mongoimport --db=webrtc-conferencing --collection=participants --file=participants.json
mongoimport --db=webrtc-conferencing --collection=callstats --file=callstats.json
```

## Troubleshooting

### MongoDB Not Starting
```bash
# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log  # Linux
tail -f /opt/homebrew/var/log/mongodb/mongo.log  # macOS Homebrew

# Check if port is in use
lsof -i :27017  # macOS/Linux
netstat -ano | findstr :27017  # Windows

# Kill process on port 27017 (if needed)
kill -9 $(lsof -t -i:27017)  # macOS/Linux
```

### Connection Refused
- Make sure MongoDB is running: `brew services list` (macOS) or `sudo systemctl status mongod` (Linux)
- Check firewall settings
- Verify `MONGODB_URI` in `.env` is correct

### Permission Denied
```bash
# MongoDB data directory permissions (Linux)
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chmod -R 755 /var/lib/mongodb
```

## Production Recommendations

1. **Use MongoDB Atlas** (cloud) for production
2. **Enable authentication** in MongoDB
3. **Use connection pooling**
4. **Set up regular backups**
5. **Monitor database performance**
6. **Use indexes** (already set up in schemas)

## Alternative: MongoDB Atlas (Free Tier)

1. Sign up at: https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/webrtc-conferencing?retryWrites=true&w=majority
```

No local MongoDB installation needed!

---

**Remember**: The app works perfectly without MongoDB. Only enable it if you need:
- Room persistence across restarts
- Call statistics
- Participant history
- Analytics
