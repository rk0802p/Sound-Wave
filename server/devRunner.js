const path = require('path');
process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, "node_modules/.cache/mongodb-memory-server");
process.env.MONGOMS_MD5_CHECK = "0";

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function start() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = 'super_secret_test_jwt_key_2026';
  process.env.PORT = '5000';

  const app = require('./index');
  const { connectDB } = require('./index');
  await connectDB();

  const server = app.listen(5000, () => {
    console.log('SOUNDWAVE_BACKEND_READY on http://localhost:5000');
  });

  const cleanup = async () => {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start().catch((err) => {
  console.error('Failed to start dev runner:', err);
  process.exit(1);
});
