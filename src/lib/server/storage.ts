import { S3Client } from "bun";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT!;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY!;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY!;
const MINIO_BUCKET = process.env.MINIO_BUCKET!;

export const s3Credentials = {
  accessKeyId: MINIO_ACCESS_KEY,
  secretAccessKey: MINIO_SECRET_KEY,
  bucket: MINIO_BUCKET,
  endpoint: MINIO_ENDPOINT,
};

export const s3Client = new S3Client(s3Credentials);


