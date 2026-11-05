const request = require("supertest");
const app = require("../index");
const { connectTestDB, closeTestDB, clearTestDB } = require("./setup");
const logger = require("../utils/logger");

describe("Milestone 6.1: Production Hardening & Observability Tests", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    logger.clearRecentLogs();
  });

  describe("Request Correlation & Request ID Middleware", () => {
    it("should generate a valid x-request-id header when none is provided", async () => {
      const res = await request(app).get("/api/test");
      expect(res.status).toBe(200);
      expect(res.headers["x-request-id"]).toBeDefined();
      // Should be valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(res.headers["x-request-id"]).toMatch(uuidRegex);
    });

    it("should accept and echo a valid client-supplied x-request-id", async () => {
      const validClientId = "client-req-12345-abcde";
      const res = await request(app)
        .get("/api/test")
        .set("x-request-id", validClientId);

      expect(res.status).toBe(200);
      expect(res.headers["x-request-id"]).toBe(validClientId);
    });

    it("should reject malformed or suspicious x-request-id and generate a safe UUID", async () => {
      const suspiciousId = "bad<script>alert(1)</script>; DROP TABLE users;--";
      const res = await request(app)
        .get("/api/test")
        .set("x-request-id", suspiciousId);

      expect(res.status).toBe(200);
      expect(res.headers["x-request-id"]).not.toBe(suspiciousId);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(res.headers["x-request-id"]).toMatch(uuidRegex);
    });
  });

  describe("Structured JSON Logging & Safe Redaction", () => {
    it("should securely redact sensitive keys (password, token, secret, auth)", () => {
      const sensitiveData = {
        username: "testuser",
        password: "supersecretpassword123",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        apiKey: "jamendo_secret_api_key_456",
        clientSecret: "spotify_client_secret_789",
        safeMeta: "public_information",
      };

      const redacted = logger.redact(sensitiveData);

      expect(redacted.username).toBe("testuser");
      expect(redacted.safeMeta).toBe("public_information");
      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.token).toBe("[REDACTED]");
      expect(redacted.apiKey).toBe("[REDACTED]");
      expect(redacted.clientSecret).toBe("[REDACTED]");
    });

    it("should capture structured log entries in buffer with request context", async () => {
      const customReqId = "audit-log-test-req-001";
      await request(app)
        .get("/api/test")
        .set("x-request-id", customReqId);

      const logs = logger.getRecentLogs(10);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);

      const matchedLog = logs.find((l) => l.requestId === customReqId);
      expect(matchedLog).toBeDefined();
      expect(matchedLog.method).toBe("GET");
      expect(matchedLog.path || matchedLog.url).toBe("/api/test");
      expect(matchedLog.status).toBe(200);
      expect(typeof matchedLog.durationMs).toBe("number");
    });
  });

  describe("Provider Health & Circuit Breaker Telemetry (/api/search/providers/health)", () => {
    it("should return detailed telemetry for registered providers without exposing credentials", async () => {
      const res = await request(app).get("/api/search/providers/health");
      expect(res.status).toBe(200);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.providers).toBeDefined();

      const providers = res.body.providers;
      // Only authorized registered providers are active in runtime telemetry
      expect(providers.jamendo).toBeDefined();
      expect(providers.saavn).toBeUndefined(); // Rejected provider not registered
      expect(providers.archive).toBeUndefined(); // Pending provider not registered
      expect(providers.audius).toBeUndefined(); // Pending provider not registered

      // Check circuit breaker fields for active provider
      const jamendoCb = providers.jamendo.circuitBreaker;
      expect(jamendoCb).toBeDefined();
      expect(jamendoCb.state).toBe("CLOSED");
      expect(jamendoCb.isOpen).toBe(false);
      expect(typeof jamendoCb.successCount).toBe("number");
      expect(typeof jamendoCb.totalFailures).toBe("number");
      expect(jamendoCb.latency).toBeDefined();

      // Ensure no credentials or raw tokens are exposed
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(process.env.JWT_SECRET);
      expect(bodyStr).not.toContain("password");
      expect(bodyStr).not.toContain("Bearer");
    });

    it("should track latency and circuit breaker status across searches", async () => {
      // Execute a real search to trigger telemetry updates
      await request(app).get("/api/search?q=ambient");

      const res = await request(app).get("/api/search/providers/health");
      expect(res.status).toBe(200);
      const jamendo = res.body.providers.jamendo;
      expect(jamendo).toBeDefined();
      expect(jamendo.circuitBreaker.transitionCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("System Diagnostics & Health Separation (/api/test)", () => {
    it("should clearly differentiate process, database, and provider states", async () => {
      const res = await request(app).get("/api/test");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");

      // Process health
      expect(res.body.process).toBeDefined();
      expect(typeof res.body.process.uptime).toBe("number");
      expect(typeof res.body.process.pid).toBe("number");
      expect(res.body.process.environment).toBeDefined();

      // Database health
      expect(res.body.database).toBeDefined();
      expect(res.body.database.status).toBe("connected");
      expect(res.body.database.readyState).toBe(1);

      // Provider health aggregation
      expect(res.body.providers).toBeDefined();
      expect(typeof res.body.providers.total).toBe("number");

      // Environment verification flags
      expect(res.body.configured).toBeDefined();
      expect(res.body.configured.hasMongoUri).toBe(true);
      expect(res.body.configured.hasJwtSecret).toBe(true);
    });
  });
});
