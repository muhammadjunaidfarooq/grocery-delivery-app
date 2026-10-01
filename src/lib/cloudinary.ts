export const runtime = "nodejs"; // ✅ important

import { Readable } from "stream";
import { v2 as cloudinary } from "cloudinary";

// 2. Configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (file: Blob): Promise<string | null> => {
  if (!file) return null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "omnimart_groceries",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Upload Error:", error);
            return reject(error);
          }
          resolve(result?.secure_url ?? null);
        },
      );

      Readable.from(buffer).pipe(stream);
    });
  } catch (error) {
    console.error("Upload Logic Error:", error);
    return null;
  }
};

const UPLOAD_FOLDER = "omnimart_groceries";

// Public id of one of OUR uploads, worked out from its URL. Returns null for
// any URL that is not in our folder, so we can never delete other files.
export const publicIdFromUrl = (url: string): string | null => {
  const match = /\/upload\/(?:v\d+\/)?(.+?)\.[A-Za-z0-9]+$/.exec(url);
  if (!match) return null;
  const publicId = decodeURIComponent(match[1]);
  if (publicId.includes("..")) return null;
  return publicId.startsWith(`${UPLOAD_FOLDER}/`) ? publicId : null;
};

// Deletes the file from Cloudinary. Returns true only if it was deleted.
export const deleteFromCloudinary = async (url: string): Promise<boolean> => {
  const publicId = publicIdFromUrl(url);
  if (!publicId) return false;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    return false;
  }
};

export default uploadOnCloudinary;
