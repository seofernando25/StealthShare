import { S3Client } from "bun";
import { deleteObject, s3Credentials } from "$lib/server/storage";
import type { RequestHandler } from "./$types";

export const DELETE: RequestHandler = async ({ params }) => {
  const identifier = decodeURIComponent(params.id);
  
  try {
    let storageKey = identifier;

    const uuidMatch = identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    if (uuidMatch) {
      // Find the actual storage key by listing objects with the UUID prefix
      const result = await S3Client.list(
        { prefix: identifier, maxKeys: 1 },
        s3Credentials
      );

      const foundKey = result.contents?.find((obj) => obj.key && obj.key.startsWith(identifier))?.key;
      if (!foundKey) {
        return new Response("File not found", { status: 404 });
      }

      storageKey = foundKey;
    }

    // Delete the file from S3
    await deleteObject(storageKey);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    if (err.message === "File not found") {
      return new Response("File not found", { status: 404 });
    }
    console.error("Error deleting file:", err);
    return new Response("Internal server error", { status: 500 });
  }
};

