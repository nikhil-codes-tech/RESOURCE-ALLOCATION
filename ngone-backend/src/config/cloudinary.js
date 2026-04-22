import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {object} options
 * @param {string} options.folder - Cloudinary folder path
 * @param {string} [options.publicId] - Custom public ID
 * @param {string} [options.resourceType] - 'image' | 'raw' | 'auto'
 * @returns {Promise<object>} Cloudinary upload result
 */
export async function uploadToCloudinary(buffer, options = {}) {
  const folder = `${process.env.CLOUDINARY_FOLDER || 'ngone'}/${options.folder || 'uploads'}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: options.publicId,
        resource_type: options.resourceType || 'auto',
        transformation: options.transformation || [],
        quality: 'auto:good',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload error: ${error.message}`);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete a file from Cloudinary by public ID
 * @param {string} publicId
 * @param {string} [resourceType='image']
 */
export async function deleteFromCloudinary(publicId, resourceType = 'image') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    logger.error(`Cloudinary delete error: ${error.message}`);
    throw error;
  }
}

/**
 * Generate an optimized URL for an existing image
 * @param {string} publicId
 * @param {object} [transformations]
 * @returns {string}
 */
export function getOptimizedUrl(publicId, transformations = {}) {
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    secure: true,
    ...transformations,
  });
}

export default cloudinary;
