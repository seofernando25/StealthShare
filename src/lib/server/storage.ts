import { S3Client, write } from "bun";

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

export async function putObject(key: string, data: Buffer): Promise<void> {
  const s3file = s3Client.file(key);
  await write(s3file, data);
}

export async function getObject(key: string): Promise<Buffer> {
  try {
    const s3file = s3Client.file(key);
    const arrayBuffer = await s3file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    if (error?.message?.includes("not found") || error?.message?.includes("NoSuchKey")) {
      throw new Error("File not found");
    }
    throw error;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const s3file = s3Client.file(key);
  await s3file.delete();
}
