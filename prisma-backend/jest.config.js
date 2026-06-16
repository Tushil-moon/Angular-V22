/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  setupFiles: ["<rootDir>/src/tests/setup-env.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/generated/**", "!src/server.ts"],
};
