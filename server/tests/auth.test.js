const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../index");
const User = require("../models/User");
const { connectTestDB, closeTestDB, clearTestDB } = require("./setup");

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe("Auth Integration Tests", () => {
  const validUser = {
    username: "testuser",
    email: "test@example.com",
    password: "Password123!",
  };

  describe("POST /api/auth/signup", () => {
    it("should register a new user and return a JWT token and user info", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toMatchObject({
        username: validUser.username,
        email: validUser.email,
      });
      expect(res.body.user).not.toHaveProperty("password");

      // Verify user is in database with hashed password
      const dbUser = await User.findOne({ email: validUser.email });
      expect(dbUser).not.toBeNull();
      expect(dbUser.password).not.toBe(validUser.password);
    });

    it("should reject signup when email is already registered", async () => {
      await request(app).post("/api/auth/signup").send(validUser);

      const res = await request(app).post("/api/auth/signup").send(validUser);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it("should reject signup with an invalid email address", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validUser, email: "invalid-email" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid email/i);
    });

    it("should reject signup with a password shorter than 6 characters", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validUser, password: "123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 6 characters/i);
    });

    it("should reject signup with missing or short username", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validUser, username: "a" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 2 characters/i);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/signup").send(validUser);
    });

    it("should log in an existing user with valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: validUser.email, password: validUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe(validUser.email);
    });

    it("should reject login with an incorrect password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: validUser.email, password: "WrongPassword" });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it("should reject login with a non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "ghost@example.com", password: "Password123!" });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it("should reject login when email or password is missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: validUser.email });

      expect(res.status).toBe(400);
    });
  });

  describe("Token Verification & Expiration", () => {
    it("should allow access to protected route with valid token", async () => {
      const signupRes = await request(app)
        .post("/api/auth/signup")
        .send(validUser);
      const token = signupRes.body.token;

      const res = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/access granted/i);
    });

    it("should reject access when no authorization header is provided", async () => {
      const res = await request(app).get("/api/protected");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("NO_TOKEN");
    });

    it("should reject access when token is invalid or malformed", async () => {
      const res = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer this-is-not-a-valid-token");

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_TOKEN");
    });

    it("should reject access and return TOKEN_EXPIRED when token is expired", async () => {
      const expiredToken = jwt.sign(
        { id: "64fa12345678901234567890", username: "expiredUser" },
        process.env.JWT_SECRET,
        { expiresIn: "0s" }
      );

      const res = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("TOKEN_EXPIRED");
    });

    it("should return profile for current user at GET /api/auth/me", async () => {
      const signupRes = await request(app)
        .post("/api/auth/signup")
        .send(validUser);
      const token = signupRes.body.token;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        username: validUser.username,
        email: validUser.email,
      });
    });
  });
});
