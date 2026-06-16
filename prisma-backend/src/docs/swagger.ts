import swaggerJsdoc from "swagger-jsdoc";
import { env } from "../config/env";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Enterprise Auth API",
      version: "1.0.0",
      description: "Authentication, authorization, session, OTP, and RBAC API built with Express, Prisma, and TypeScript.",
    },
    servers: [{ url: `${env.API_BASE_URL}/api/v1` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        RegisterRequest: {
          type: "object",
          required: ["password"],
          properties: {
            email: { type: "string", format: "email" },
            phone: { type: "string", example: "+919999999999" },
            password: { type: "string", format: "password" },
            deviceName: { type: "string" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["password"],
          properties: {
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            password: { type: "string", format: "password" },
            deviceName: { type: "string" },
          },
        },
        TokenPair: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: { summary: "Health check", responses: { "200": { description: "OK" } } },
      },
      "/auth/register": {
        post: {
          summary: "Register with email/phone and password",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
          responses: { "201": { description: "Registered" } },
        },
      },
      "/auth/login": {
        post: {
          summary: "Login with email or phone and password",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
          responses: { "200": { description: "Logged in" } },
        },
      },
      "/auth/refresh": {
        post: { summary: "Rotate refresh token", responses: { "200": { description: "Token pair" } } },
      },
      "/auth/otp/request": {
        post: { summary: "Request phone OTP", responses: { "200": { description: "OTP sent" } } },
      },
      "/auth/otp/verify": {
        post: { summary: "Verify phone OTP and login/register", responses: { "200": { description: "Verified" } } },
      },
      "/auth/logout": {
        post: { summary: "Logout current device", security: [{ bearerAuth: [] }], responses: { "200": { description: "Logged out" } } },
      },
      "/auth/logout-all": {
        post: { summary: "Logout all devices", security: [{ bearerAuth: [] }], responses: { "200": { description: "Logged out" } } },
      },
      "/users/me": {
        get: { summary: "Current user profile", security: [{ bearerAuth: [] }], responses: { "200": { description: "Current user" } } },
      },
      "/sessions": {
        get: { summary: "List current user's sessions", security: [{ bearerAuth: [] }], responses: { "200": { description: "Sessions" } } },
      },
      "/roles": {
        get: { summary: "List roles", security: [{ bearerAuth: [] }], responses: { "200": { description: "Roles" } } },
      },
    },
  },
  apis: [],
});
