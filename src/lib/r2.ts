import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  // Without these the SDK inherits Node's "no timeout at all", so a stalled R2
  // hangs GET /api/documents/[id] indefinitely — and with it the service
  // worker's document precache and the download spinner on the phone. Same
  // reasoning as src/lib/fetch-timeout.ts, which does not apply here because
  // the SDK does not go through `fetch`. Passed as a plain object: the SDK
  // forwards it to the default NodeHttpHandler constructor, so we don't have to
  // depend on @smithy/node-http-handler directly.
  requestHandler: {
    connectionTimeout: 3_000,
    requestTimeout: 15_000, // documents are PDFs and photos, not big files
  },
  maxAttempts: 2,
});

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function getFromR2(key: string) {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return res.Body as ReadableStream;
}

export async function deleteFromR2(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
