const path = require("path");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "super_secret_test_jwt_key_2026";
process.env.JWT_EXPIRES_IN = "7d";
process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, "../node_modules/.cache/mongodb-memory-server");

const connectTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
};

const closeTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

const clearTestDB = async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

module.exports = {
  connectTestDB,
  closeTestDB,
  clearTestDB,
};
