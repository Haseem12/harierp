// src/lib/storageUtils.ts

/**
 * Uploads a file to a custom server endpoint.
 * @param file The file to upload.
 * @param uploadPathSegment Optional: A segment to suggest a path on the server (e.g., 'product-images', 'raw-material-images'). The server-side script will ultimately determine the final path.
 * @returns A promise that resolves with the public URL of the uploaded file.
 */
export async function uploadFileToServer(file: File, uploadPathSegment: string = 'general-uploads'): Promise<string> {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const formData = new FormData();
  formData.append('fileToUpload', file);
  formData.append('pathSegment', uploadPathSegment); // Send path suggestion to server

  const uploadUrl = 'https://sajfoods.net/busa-api/database/upload_image.php'; // Replace with your actual PHP endpoint URL

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      // Note: Do not set 'Content-Type' header when using FormData with fetch,
      // the browser will set it correctly with the boundary.
    });

    if (!response.ok) {
      let errorMessage = `File upload failed with status: ${response.status}`;
      try {
        const errorResult = await response.json();
        errorMessage = errorResult.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use the status text
        errorMessage = `${errorMessage} - ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (result.success && result.url) {
      return result.url;
    } else {
      throw new Error(result.message || 'File upload succeeded but server did not return a valid URL.');
    }
  } catch (error: any) {
    console.error("Error uploading file to server:", error);
    // Re-throw a more generic error or the original error
    throw new Error(error.message || 'File upload failed. Please try again.');
  }
}
