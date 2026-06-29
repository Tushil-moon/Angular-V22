import request from "supertest";

import app from "../app";

describe("contacts API", () => {
  it("returns 401 without authentication", async () => {
    const response = await request(app).get("/api/v1/contacts");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe("organizations invites API", () => {
  it("returns 401 when accepting invite without authentication", async () => {
    const response = await request(app).post("/api/v1/organizations/invites/invalid-token/accept");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
