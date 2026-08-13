import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isAllowedImageMimeType(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.has(mimeType);
}

export function sanitizeUploadFileName(fileName: string): string {
  const base = path.basename(fileName).replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
  return base.slice(0, 180) || "upload";
}

export function buildMediaStorageKey(fileName: string): string {
  return `media/${randomUUID()}-${sanitizeUploadFileName(fileName)}`;
}

function isS3Configured(): boolean {
  return Boolean(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  s3Client ??= new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    });
  return s3Client;
}

function buildS3PublicUrl(storageKey: string): string {
  const bucket = env.S3_BUCKET!;
  if (env.S3_ENDPOINT) {
    const endpoint = env.S3_ENDPOINT.replace(/\/$/, "");
    return env.S3_FORCE_PATH_STYLE
      ? `${endpoint}/${bucket}/${storageKey}`
      : `${endpoint}/${storageKey}`;
  }
  return `https://${bucket}.s3.${env.S3_REGION}.amazonaws.com/${storageKey}`;
}

function getPublicBaseUrl(): string {
  if (env.PUBLIC_BASE_URL) {
    return env.PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  const apiBase = env.API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return apiBase.replace(/\/api\/v\d+$/, "");
}

function buildLocalPublicUrl(storageKey: string): string {
  const base = getPublicBaseUrl();
  return `${base}/uploads/${storageKey.split(path.sep).join("/")}`;
}

async function uploadToLocal(storageKey: string, buffer: Buffer): Promise<string> {
  const absolutePath = path.join(env.UPLOAD_DIR, storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return buildLocalPublicUrl(storageKey);
}

async function uploadToS3(storageKey: string, buffer: Buffer, mimeType: string): Promise<string> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
  return buildS3PublicUrl(storageKey);
}

export async function uploadObject(
  storageKey: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ url: string; storageKey: string }> {
  const url = isS3Configured()
    ? await uploadToS3(storageKey, buffer, mimeType)
    : await uploadToLocal(storageKey, buffer);

  return { url, storageKey };
}

export function getUploadStorageMode(): "s3" | "local" {
  return isS3Configured() ? "s3" : "local";
}
