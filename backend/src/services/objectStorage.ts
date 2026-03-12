import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucketName = process.env.B2_BUCKET_NAME || process.env.BACKBLAZE_BUCKET || "";
const endpoint = process.env.B2_ENDPOINT || process.env.BACKBLAZE_ENDPOINT || "";
const region = process.env.B2_REGION || process.env.BACKBLAZE_REGION || "us-east-1";
const accessKeyId =
  process.env.B2_KEY_ID || process.env.BACKBLAZE_KEY_ID || process.env.B2_APPLICATION_KEY_ID || "";
const secretAccessKey =
  process.env.B2_APPLICATION_KEY ||
  process.env.B2_APP_KEY ||
  process.env.BACKBLAZE_APPLICATION_KEY ||
  "";

const enabled = Boolean(bucketName && endpoint && accessKeyId && secretAccessKey);

const client = enabled
  ? new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    })
  : null;

const sanitizeFileName = (value: string) =>
  String(value || "file")
    .trim()
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_");

export const isObjectStorageEnabled = () => enabled;

export const uploadBufferToObjectStorage = async (
  key: string,
  content: Buffer,
  contentType: string
) => {
  if (!client || !enabled) {
    throw new Error("Object storage is not configured");
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: contentType || "application/octet-stream",
    })
  );
};

export const getObjectStorageDownloadUrl = async (key: string, expiresInSeconds = 900) => {
  if (!client || !enabled) {
    throw new Error("Object storage is not configured");
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
    { expiresIn: expiresInSeconds }
  );
};

export const deleteObjectFromObjectStorage = async (key: string) => {
  if (!client || !enabled) {
    throw new Error("Object storage is not configured");
  }

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
};

export const downloadObjectFromObjectStorage = async (key: string) => {
  if (!client || !enabled) {
    throw new Error("Object storage is not configured");
  }

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  const body: any = response.Body;
  if (!body) {
    throw new Error("Object storage returned empty body");
  }

  const bytes = await body.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    contentType: response.ContentType || "application/octet-stream",
    contentLength: response.ContentLength,
  };
};

export const buildCompanyDocumentStorageKey = (file: Express.Multer.File) => {
  const now = new Date();
  const dateSegment = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `companies/${dateSegment}/${Date.now()}-${sanitizeFileName(file.originalname)}`;
};
