/**
 * File Upload API Routes
 * Handle image and video uploads to Cloudflare R2
 */

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { body, param, validationResult } = require('express-validator');

const {
  r2Client,
  storageConfig,
  generateUniqueFilename,
  getPublicUrl,
  validateFileType,
  validateFileSize
} = require('../config/cloudflare');

const router = express.Router();

/**
 * Configure multer for file uploads
 * Store files in memory for processing before uploading to R2
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: storageConfig.maxFileSize,
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation
    const isImage = validateFileType(file.mimetype, 'image');
    const isVideo = validateFileType(file.mimetype, 'video');
    
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }
  }
});

/**
 * Helper function to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Process and optimize images
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Processing options
 * @returns {Buffer} Processed image buffer
 */
const processImage = async (buffer, options = {}) => {
  const {
    width = 1920,
    height = null,
    quality = 85,
    format = 'webp'
  } = options;
  
  let processor = sharp(buffer);
  
  // Resize if dimensions provided
  if (width || height) {
    processor = processor.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }
  
  // Convert format and compress
  switch (format) {
    case 'webp':
      processor = processor.webp({ quality });
      break;
    case 'jpeg':
      processor = processor.jpeg({ quality });
      break;
    case 'png':
      processor = processor.png({ compressionLevel: 8 });
      break;
    default:
      processor = processor.webp({ quality });
  }
  
  return processor.toBuffer();
};

/**
 * Upload file to Cloudflare R2
 * @param {Buffer} buffer - File buffer
 * @param {string} key - File key/path
 * @param {string} contentType - File content type
 * @returns {Object} Upload result
 */
const uploadToR2 = async (buffer, key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000', // 1 year cache
    Metadata: {
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'portfolio-backend'
    }
  });
  
  await r2Client.send(command);
  
  return {
    key,
    url: getPublicUrl(key),
    size: buffer.length,
    contentType
  };
};

/**
 * @route   POST /api/upload/image
 * @desc    Upload and optimize images
 * @access  Private (Admin only - to be implemented)
 */
router.post('/image', upload.array('images', 5), [
  body('directory')
    .optional()
    .isIn(['projects', 'blog', 'youtube', 'profile'])
    .withMessage('Invalid directory'),
  body('width')
    .optional()
    .isInt({ min: 100, max: 4000 })
    .withMessage('Width must be between 100 and 4000 pixels'),
  body('height')
    .optional()
    .isInt({ min: 100, max: 4000 })
    .withMessage('Height must be between 100 and 4000 pixels'),
  body('quality')
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage('Quality must be between 10 and 100'),
  body('format')
    .optional()
    .isIn(['webp', 'jpeg', 'png'])
    .withMessage('Invalid format')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }
    
    const {
      directory = 'projects',
      width,
      height,
      quality = 85,
      format = 'webp'
    } = req.body;
    
    const uploadPromises = req.files.map(async (file) => {
      try {
        // Validate file
        if (!validateFileType(file.mimetype, 'image')) {
          throw new Error(`Invalid image type: ${file.mimetype}`);
        }
        
        if (!validateFileSize(file.size)) {
          throw new Error(`File too large: ${file.size} bytes`);
        }
        
        // Process image
        const processedBuffer = await processImage(file.buffer, {
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          quality: parseInt(quality),
          format
        });
        
        // Generate filename
        const directoryPath = storageConfig.directories[directory] || '';
        const filename = generateUniqueFilename(file.originalname, directoryPath);
        const contentType = `image/${format}`;
        
        // Upload to R2
        const result = await uploadToR2(processedBuffer, filename, contentType);
        
        return {
          ...result,
          originalName: file.originalname,
          originalSize: file.size,
          processedSize: processedBuffer.length,
          compressionRatio: ((file.size - processedBuffer.length) / file.size * 100).toFixed(2)
        };
        
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        return {
          originalName: file.originalname,
          error: error.message
        };
      }
    });
    
    const results = await Promise.all(uploadPromises);
    
    // Separate successful uploads from errors
    const successful = results.filter(result => !result.error);
    const failed = results.filter(result => result.error);
    
    res.json({
      success: successful.length > 0,
      message: `${successful.length} image(s) uploaded successfully${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
      data: {
        uploaded: successful,
        failed: failed,
        summary: {
          total: req.files.length,
          successful: successful.length,
          failed: failed.length
        }
      }
    });
    
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/upload/video
 * @desc    Upload videos
 * @access  Private (Admin only - to be implemented)
 */
router.post('/video', upload.single('video'), [
  body('directory')
    .optional()
    .isIn(['projects', 'blog', 'youtube'])
    .withMessage('Invalid directory')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video uploaded'
      });
    }
    
    const { directory = 'projects' } = req.body;
    
    // Validate file
    if (!validateFileType(req.file.mimetype, 'video')) {
      return res.status(400).json({
        success: false,
        message: `Invalid video type: ${req.file.mimetype}`
      });
    }
    
    if (!validateFileSize(req.file.size)) {
      return res.status(400).json({
        success: false,
        message: `File too large: ${req.file.size} bytes. Maximum size is ${storageConfig.maxFileSize} bytes.`
      });
    }
    
    // Generate filename
    const directoryPath = storageConfig.directories[directory] || '';
    const filename = generateUniqueFilename(req.file.originalname, directoryPath);
    
    // Upload to R2
    const result = await uploadToR2(req.file.buffer, filename, req.file.mimetype);
    
    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        ...result,
        originalName: req.file.originalname,
        originalSize: req.file.size
      }
    });
    
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/upload/:key
 * @desc    Delete file from R2
 * @access  Private (Admin only - to be implemented)
 */
router.delete('/:key(*)', [
  param('key').isLength({ min: 1 }).withMessage('File key is required')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    const key = req.params.key;
    
    const command = new DeleteObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key
    });
    
    await r2Client.send(command);
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      data: {
        key,
        deletedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('File deletion error:', error);
    
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/upload/config
 * @desc    Get upload configuration
 * @access  Public
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      maxFileSize: storageConfig.maxFileSize,
      allowedImageTypes: storageConfig.allowedImageTypes,
      allowedVideoTypes: storageConfig.allowedVideoTypes,
      directories: Object.keys(storageConfig.directories),
      supportedFormats: ['webp', 'jpeg', 'png'],
      maxFiles: 5
    }
  });
});

/**
 * Error handling middleware for multer
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${storageConfig.maxFileSize / 1024 / 1024}MB`
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files per request'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  console.error('Upload error:', error);
  res.status(500).json({
    success: false,
    message: 'Upload failed',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;