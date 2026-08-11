import request from "supertest";

jest.mock("../config/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

jest.mock("../config/redis", () => ({
  isRedisEnabled: jest.fn().mockReturnValue(false),
  pingRedis: jest.fn().mockResolvedValue(false),
}));

import app from "../app";

describe("health", () => {
  it("returns API health", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "OK",
      data: { database: "connected" },
    });
  });

  it("returns live status", async () => {
    const response = await request(app).get("/api/v1/health/live");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ status: "ok" });
  });

  it("returns ready when database is up and redis is optional", async () => {
    const response = await request(app).get("/api/v1/health/ready");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      status: "ready",
      database: "connected",
      redis: "disabled",
    });
  });
});
