import { error, json } from '@sveltejs/kit';
import { putObject } from '$lib/server/storage';
import { randomUUID } from 'crypto';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file');

    if (!files || files.length === 0) {
      return error(400, 'No files provided');
    }

    const uploadedFiles: Array<{ 
      id: string; 
      originalName: string;
      url: string;
      downloadUrl: string;
    }> = [];

    // Process each file
    for (const file of files) {
      if (file instanceof File) {
        try {
          // Generate unique ID for this file
          const fileId = randomUUID();
          
          // Read file as ArrayBuffer
          const buffer = await file.arrayBuffer();
          
          // Upload to MinIO storage with unique ID as the key
          // Store as: {id}-{originalName} to preserve original filename for download
          const storageKey = `${fileId}-${file.name}`;
          
          console.log('Uploading file to MinIO:', storageKey);
          // Upload to MinIO - this will throw if it fails
          await putObject(storageKey, Buffer.from(buffer));
          
          uploadedFiles.push({
            id: fileId,
            originalName: file.name,
            url: `/f/${fileId}`, // Direct download URL (auto-downloads)
            downloadUrl: `/api/f/${fileId}` // Alternative API download URL
          });
        } catch (fileError) {
          console.error(`Failed to upload file ${file.name}:`, fileError);
          // If any file fails, return error
          return error(500, `Failed to upload file: ${file.name}`);
        }
      }
    }

    // Check if we actually uploaded any files
    if (uploadedFiles.length === 0) {
      return error(400, 'No valid files to upload');
    }

    // Always return consistent response format with files array
    return json({ 
      success: true, 
      message: uploadedFiles.length === 1 
        ? 'File uploaded successfully' 
        : 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (err) {
    console.error('Upload error:', err);
    return error(500, 'Failed to upload files');
  }
};
