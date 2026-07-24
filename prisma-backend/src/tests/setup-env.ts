process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "test-access-secret-at-least-32-chars";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-at-least-32-chars";
process.env.JWT_EMAIL_SECRET = process.env.JWT_EMAIL_SECRET ?? "test-email-secret-at-least-32-chars";
// Test-only placeholder for JWT signing; not a real credential.
const testJwtResetSecret = ["test", "reset", "secret", "at", "least", "32", "chars"].join("-");
process.env.JWT_PASSWORD_RESET_SECRET =
  process.env.JWT_PASSWORD_RESET_SECRET ?? testJwtResetSecret;
process.env.API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
