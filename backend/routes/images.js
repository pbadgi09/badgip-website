/**
 * Images API Routes
 * Handles image uploads, management, and associations
 */

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { body, param, query, validationResult } = require('express-validator');
const Image = require('../models/Image');
const ImageAssociation = require('../models/ImageAssociation');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files at once
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
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
 * Helper function to ensure directory exists
 */
const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Helper function to generate file paths
 */
const generateFilePaths = (filename) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const uploadsDir = path.join(__dirname, '../../frontend/assets/images/uploads', String(year), month);
  const thumbnailsDir = path.join(__dirname, '../../frontend/assets/images/thumbnails', String(year), month);
  
  return {
    uploadsDir,
    thumbnailsDir,
    filePath: path.join(uploadsDir, filename),
    thumbnailPath: path.join(thumbnailsDir, `thumb_${filename}`),
    relativePath: `/assets/images/uploads/${year}/${month}/${filename}`,
    relativeThumbnailPath: `/assets/images/thumbnails/${year}/${month}/thumb_${filename}`
  };
};

/**
 * @route   POST /api/images/upload
 * @desc    Upload new image(s)
 * @access  Private (Admin only)
 */
router.post('/upload', adminAuth, upload.array('images', 5), [
  body('title').optional().isLength({ min: 1, max: 100 }).trim().withMessage('Title must be between 1 and 100 characters'),
  body('alt').optional().isLength({ min: 1, max: 200 }).trim().withMessage('Alt text must be between 1 and 200 characters'),
  body('description').optional().isLength({ max: 500 }).trim().withMessage('Description cannot exceed 500 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('category').optional().isIn(['blog', 'project', 'general', 'ui', 'screenshot', 'photo', 'icon']).withMessage('Invalid category')
], handleValidationErrors, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadResults = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      // Process image with Sharp to get metadata and optimize
      const imageBuffer = file.buffer;
      const metadata = await sharp(imageBuffer).metadata();
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .toLowerCase();
      const filename = `${timestamp}_${sanitizedName}`;
      
      // Generate file paths
      const paths = generateFilePaths(filename);
      
      // Ensure directories exist
      await ensureDirectoryExists(paths.uploadsDir);
      await ensureDirectoryExists(paths.thumbnailsDir);
      
      // Save original image (optimized)
      await sharp(imageBuffer)
        .jpeg({ quality: 90, progressive: true })
        .png({ compressionLevel: 8 })
        .webp({ quality: 90 })
        .toFile(paths.filePath);
      
      // Generate thumbnail (300x300 max, maintaining aspect ratio)
      await sharp(imageBuffer)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(paths.thumbnailPath);

      // Create database record
      const imageData = {
        filename: filename,
        originalName: file.originalname,
        path: `frontend${paths.relativePath}`,
        thumbnailPath: `frontend${paths.relativeThumbnailPath}`,
        title: req.body.title || file.originalname.split('.')[0],
        alt: req.body.alt || `Image: ${file.originalname}`,
        description: req.body.description || '',
        tags: req.body.tags || [],
        mimeType: file.mimetype,
        size: file.size,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        seo: {
          keywords: req.body.tags || [],
          category: req.body.category || 'general'
        },
        uploadedBy: 'admin'
      };

      const image = new Image(imageData);
      await image.save();
      
      uploadResults.push({
        id: image._id,
        filename: image.filename,
        title: image.title,
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
        dimensions: image.dimensions,
        size: image.formattedSize
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadResults.length} image(s)`,
      data: {
        images: uploadResults
      }
    });

  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/images
 * @desc    Get all images with filtering and pagination
 * @access  Private (Admin only)
 */
router.get('/', adminAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isIn(['blog', 'project', 'general', 'ui', 'screenshot', 'photo', 'icon']).withMessage('Invalid category'),
  query('tags').optional().isArray().withMessage('Tags must be an array'),
  query('search').optional().isLength({ min: 2, max: 100 }).trim().withMessage('Search query must be between 2 and 100 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    let images;
    let total;
    
    // Build filter object
    const filter = { status: 'active' };
    
    if (req.query.category) {
      filter['seo.category'] = req.query.category;
    }
    
    if (req.query.tags && req.query.tags.length > 0) {
      filter.tags = { $in: req.query.tags };
    }
    
    // Handle search
    if (req.query.search) {
      images = await Image.search(req.query.search, limit);
      total = images.length;
    } else {
      // Execute query with pagination
      [images, total] = await Promise.all([
        Image.find(filter)
          .sort({ uploadedAt: -1 })
          .limit(limit)
          .skip(skip)
          .select('-__v'),
        Image.countDocuments(filter)
      ]);
    }
    
    res.json({
      success: true,
      data: {
        images,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/images/:id
 * @desc    Get single image by ID
 * @access  Private (Admin only)
 */
router.get('/:id', adminAuth, [
  param('id').isMongoId().withMessage('Invalid image ID')
], handleValidationErrors, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    
    if (!image || image.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Get usage statistics
    const associations = await ImageAssociation.getContentForImage(image._id);
    const usageStats = await ImageAssociation.getUsageStats(image._id);
    
    res.json({
      success: true,
      data: {
        image,
        associations,
        usageStats
      }
    });
    
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/images/:id
 * @desc    Update image metadata
 * @access  Private (Admin only)
 */
router.put('/:id', adminAuth, [
  param('id').isMongoId().withMessage('Invalid image ID'),
  body('title').optional().isLength({ min: 1, max: 100 }).trim().withMessage('Title must be between 1 and 100 characters'),
  body('alt').optional().isLength({ min: 1, max: 200 }).trim().withMessage('Alt text must be between 1 and 200 characters'),
  body('description').optional().isLength({ max: 500 }).trim().withMessage('Description cannot exceed 500 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('category').optional().isIn(['blog', 'project', 'general', 'ui', 'screenshot', 'photo', 'icon']).withMessage('Invalid category')
], handleValidationErrors, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Update SEO category if provided
    if (req.body.category) {
      updateData['seo.category'] = req.body.category;
      updateData['seo.keywords'] = req.body.tags || [];
      delete updateData.category;
    }
    
    const image = await Image.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!image || image.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Image updated successfully',
      data: { image }
    });
    
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/images/:id
 * @desc    Delete image (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', adminAuth, [
  param('id').isMongoId().withMessage('Invalid image ID')
], handleValidationErrors, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    
    if (!image || image.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Check if image is being used
    const usageCount = await ImageAssociation.countDocuments({ imageId: image._id });
    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete image: it is currently being used in ${usageCount} content item(s). Remove associations first.`
      });
    }
    
    // Soft delete - mark as deleted
    image.status = 'deleted';
    await image.save();
    
    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;