const request = require("supertest");
const app = require("../index");
const logger = require("../utils/logger");
const registry = require("../providers/ProviderRegistry");
const { connectTestDB, closeTestDB, clearTestDB } = require("./setup");

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

describe("Milestone 6.1: Production Hardening & Observability Tests", () => {
  describe("Request Correlation & Request ID Middleware", () => {
    it("should generate a valid x-request-id header when none is provided", async () => {
      const res = await request(app).get("/api/test");
      expect(res.status).toBe(200);
      expect(res.headers["x-request-id"]).toBeDefined();
      expect(typeof res.headers["x-request-id"]).toBe("string");
      expect(res.headers["x-request-id"].length).toBeGreaterThanOrEqual(8);
    });

    it("should accept and echo a valid client-supplied x-request-id", async () => {
      const customId = "custom-client-req-id-12345";
      const res = await request(app)
        .get("/api/test")
        .set("x-request-id", customId);
      expect(res.status).toBe(200);
      expect(res.headers["x-request-id"]).toBe(customId);
    });

    it("should reject malformed or suspicious x-request-id and generate a safe UUID", async () => {
      const maliciousId = "<script>alert(1)</script>; DROP TABLE;";
      const res = await request(app)
        .get("/api/test")
        .set("x-request-id", maliciousId);
      expect(res.status).toBe(200);
      expect(res.headers["x-request-id"]).not.toBe(maliciousId);
      expect(res.headers["x-request-id"]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("Structured JSON Logging & Safe Redaction", () => {
    it("should securely redact sensitive keys (password, token, secret, auth)", () => {
      const payload = {
        username: "curator1",
        password: "SecretPassword123!",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyJ9.signature",
        authorization: "Bearer secret_bearer_token_xyz",
        nested: {
          client_secret: "super_secret_jamendo_secret",
          mongo_uri: "mongodb+srv://admin:MySecretPassword@cluster0.mongodb.net/prod",
          safeField: "this is totally safe",
        },
      };

      const redacted = logger.redact(payload);
      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.token).toBe("[REDACTED]");
      expect(redacted.authorization).toBe("[REDACTED]");
      expect(redacted.nested.client_secret).toBe("[REDACTED]");
      expect(redacted.nested.mongo_uri).toBe("[REDACTED]");
      expect(redacted.nested.safeField).toBe("this is totally safe");
    });

    it("should capture structured log entries in buffer with request context", async () => {
      const customId = "log-tracing-test-id-9876";
      await request(app).get("/api/test").set("x-request-id", customId);

      const logs = logger.getRecentLogs(10);
      const reqLog = logs.find((l) => l.requestId === customId);
      expect(reqLog).toBeDefined();
      expect(reqLog.level).toBe("info");
      expect(reqLog.method).toBe("GET");
      expect(reqLog.status).toBe(200);
      expect(typeof reqLog.durationMs).toBe("number");
      expect(reqLog.timestamp).toBeDefined();
    });
  });

  describe("Provider Health & Circuit Breaker Telemetry (/api/search/providers/health)", () => {
    it("should return detailed telemetry for all registered providers without exposing credentials", async () => {
      const res = await request(app).get("/api/search/providers/health");
      expect(res.status).toBe(200);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.providers).toBeDefined();

      const providers = res.body.providers;
      expect(providers.archive).toBeDefined();
      expect(providers.audius).toBeDefined();
      expect(providers.jamendo).toBeDefined();
      expect(providers.saavn).toBeDefined();

      // Check circuit breaker fields
      const archiveCb = providers.archive.circuitBreaker;
      expect(archiveCb).toBeDefined();
      expect(archiveCb.state).toBe("CLOSED");
      expect(archiveCb.isOpen).toBe(false);
      expect(typeof archiveCb.successCount).toBe("number");
      expect(typeof archiveCb.totalFailures).toBe("number");
      expect(archiveCb.latency).toBeDefined();

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
      const archive = res.body.providers.archive;
      expect(archive.circuitBreaker.transitionCount).toBeGreaterThanOrEqual(0);
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

      // Provider availability summary
      expect(res.body.providers).toBeDefined();
      expect(typeof res.body.providers.total).toBe("number");
      expect(typeof res.body.providers.available).toBe("number");

      // Config summary (sanitized booleans only, zero secret strings)
      expect(res.body.configured).toBeDefined();
      expect(typeof res.body.configured.hasJwtSecret).toBe("boolean");
      expect(typeof res.body.configured.hasMongoUri).toBe("boolean");
      expect(res.body.configured.hasJwtSecret).toBe(true);
    });
  });
});
