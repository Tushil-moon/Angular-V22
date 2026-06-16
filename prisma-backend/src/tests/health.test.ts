import request from "supertest";

jest.mock("../config/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
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
});
