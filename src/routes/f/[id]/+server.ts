import { error } from "@sveltejs/kit";
import { S3Client } from "bun";
import { s3Client, s3Credentials } from "$lib/server/storage";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const identifier = decodeURIComponent(params.id);
  
  try {
    let storageKey = identifier;
    let originalFilename = identifier;

    const uuidMatch = identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    if (uuidMatch) {
      const result = await S3Client.list(
        { prefix: identifier, maxKeys: 1 },
        s3Credentials
      );

      const foundKey = result.contents?.find((obj) => obj.key && obj.key.startsWith(identifier))?.key;
      if (!foundKey) {
        return new Response("File not found", { status: 404 });
      }

      storageKey = foundKey;
      originalFilename = foundKey.substring(identifier.length + 1);
    } else {
      const dashIndex = storageKey.indexOf("-");
      if (dashIndex >= 0 && dashIndex + 1 < storageKey.length) {
        originalFilename = storageKey.substring(dashIndex + 1);
      }
    }

    const s3file = s3Client.file(storageKey);
    const fileBuffer = await s3file.arrayBuffer();
    const contentType = s3file.type || 'application/octet-stream';
    
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${originalFilename}"`,
      },
    });
  } catch (err: any) {
    if (err.message === "File not found" || err?.message?.includes("not found") || err?.message?.includes("NoSuchKey")) {
      return new Response("File not found", { status: 404 });
    }
    console.error("Error getting file:", err);
    return new Response("Internal server error", { status: 500 });
  }
};

