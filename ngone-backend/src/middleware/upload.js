import multer from 'multer';
import path from 'path';
import { AppError } from '../utils/apiResponse.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Allowed file types
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOCUMENT_MIMES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALL_MIMES = [...IMAGE_MIMES, ...DOCUMENT_MIMES];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Use memory storage — upload to Cloudinary from buffer
const storage = multer.memoryStorage();

/**
 * File filter factory
 * @param {string[]} allowedMimes
 * @returns {Function}
 */
function createFileFilter(allowedMimes) {
  return (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `File type not allowed. Accepted: ${allowedMimes.join(', ')}`), false);
    }
  };
}

/**
 * Single image upload middleware
 * @param {string} fieldName - Form field name
 * @returns {Function}
 */
export function uploadSingleImage(fieldName = 'image') {
  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: createFileFilter(IMAGE_MIMES),
  }).single(fieldName);
}

/**
 * Multiple images upload middleware
 * @param {string} fieldName
 * @param {number} maxCount
 * @returns {Function}
 */
export function uploadMultipleImages(fieldName = 'images', maxCount = 5) {
  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: createFileFilter(IMAGE_MIMES),
  }).array(fieldName, maxCount);
}

/**
 * Single file upload (images + documents)
 * @param {string} fieldName
 * @returns {Function}
 */
export function uploadSingleFile(fieldName = 'file') {
  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: createFileFilter(ALL_MIMES),
  }).single(fieldName);
}

/**
 * Process uploaded file — upload to Cloudinary and attach URL to req
 * Use after multer middleware
 * @param {string} folder - Cloudinary folder path
 * @returns {Function}
 */
export function processUpload(folder = 'uploads') {
  return async (req, res, next) => {
    try {
      if (!req.file && !req.files) {
        return next();
      }

      // Single file
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, {
          folder,
          resourceType: req.file.mimetype.startsWith('image/') ? 'image' : 'raw',
        });
        req.uploadedFile = {
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          size: result.bytes,
          width: result.width,
          height: result.height,
        };
      }

      // Multiple files
      if (req.files && Array.isArray(req.files)) {
        req.uploadedFiles = [];
        for (const file of req.files) {
          const result = await uploadToCloudinary(file.buffer, {
            folder,
            resourceType: file.mimetype.startsWith('image/') ? 'image' : 'raw',
          });
          req.uploadedFiles.push({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            originalName: file.originalname,
          });
        }
      }

      next();
    } catch (error) {
      next(new AppError(500, `File upload failed: ${error.message}`));
    }
  };
}

export default {
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleFile,
  processUpload,
};
