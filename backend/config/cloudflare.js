/**
 * Cloudflare R2 Storage Configuration
 * Setup for cloud storage of images and videos
 */

const { S3Client } = require('@aws-sdk/client-s3');

/**
 * Cloudflare R2 client configuration
 * R2 is S3-compatible, so we use the AWS SDK
 */
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Storage configuration
 */
const storageConfig = {
  bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'portfolio-assets',
  publicDomain: process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || `${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev`,
  
  // File upload limits
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedVideoTypes: ['video/mp4', 'video/webm', 'video/mov'],
  
  // Directory structure
  directories: {
    projects: 'projects/',
    blog: 'blog/',
    youtube: 'youtube/',
    profile: 'profile/',
    thumbnails: 'thumbnails/'
  }
};

/**
 * Generate a unique filename
 * @param {string} originalName - Original filename
 * @param {string} directory - Target directory
 * @returns {string} Unique filename with path
 */
const generateUniqueFilename = (originalName, directory = '') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop().toLowerCase();
  
  return `${directory}${timestamp}-${randomString}.${extension}`;
};

/**
 * Get public URL for a file
 * @param {string} key - File key/path
 * @returns {string} Public URL
 */
const getPublicUrl = (key) => {
  return `https://${storageConfig.publicDomain}/${key}`;
};

/**
 * Validate file type
 * @param {string} mimetype - File MIME type
 * @param {string} type - Expected type ('image' or 'video')
 * @returns {boolean} True if valid
 */
const validateFileType = (mimetype, type) => {
  if (type === 'image') {
    return storageConfig.allowedImageTypes.includes(mimetype);
  } else if (type === 'video') {
    return storageConfig.allowedVideoTypes.includes(mimetype);
  }
  return false;
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @returns {boolean} True if valid
 */
const validateFileSize = (size) => {
  return size <= storageConfig.maxFileSize;
};

module.exports = {
  r2Client,
  storageConfig,
  generateUniqueFilename,
  getPublicUrl,
  validateFileType,
  validateFileSize
};