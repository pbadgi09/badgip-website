/**
 * YouTube API Routes
 * CRUD operations for YouTube videos
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const YouTubeVideo = require('../models/YouTubeVideo');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

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
 * @route   GET /api/youtube
 * @desc    Get YouTube videos with pagination and filtering
 * @access  Public
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isIn(['tutorial', 'demo', 'presentation', 'interview', 'review', 'other']).withMessage('Invalid category'),
  query('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  query('search').optional().isLength({ min: 2, max: 100 }).trim().withMessage('Search query must be between 2 and 100 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let videos;
    let total;
    
    // Handle search
    if (req.query.search) {
      videos = await YouTubeVideo.search(req.query.search, limit);
      total = videos.length;
    } else {
      // Build filter object
      const filter = { isActive: true };
      
      if (req.query.category) {
        filter.category = req.query.category;
      }
      
      if (req.query.featured !== undefined) {
        filter.featured = req.query.featured === 'true';
      }
      
      // Execute query
      [videos, total] = await Promise.all([
        YouTubeVideo.find(filter)
          .sort({ featured: -1, publishedAt: -1 })
          .limit(limit)
          .skip(skip)
          .select('-__v'),
        YouTubeVideo.countDocuments(filter)
      ]);
    }
    
    res.json({
      success: true,
      data: {
        videos,
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
    console.error('Error fetching YouTube videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch YouTube videos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/youtube/featured
 * @desc    Get featured YouTube videos
 * @access  Public
 */
router.get('/featured', [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], handleValidationErrors, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    const videos = await YouTubeVideo.getFeatured(limit);
    
    res.json({
      success: true,
      data: {
        videos,
        count: videos.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching featured videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured videos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/youtube/categories
 * @desc    Get video categories with counts
 * @access  Public
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await YouTubeVideo.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        categories: categories.map(cat => ({
          name: cat._id,
          count: cat.count
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/youtube/tags
 * @desc    Get all video tags
 * @access  Public
 */
router.get('/tags', async (req, res) => {
  try {
    const tags = await YouTubeVideo.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);
    
    res.json({
      success: true,
      data: {
        tags: tags.map(tag => ({
          name: tag._id,
          count: tag.count
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/youtube/:id
 * @desc    Get single video by ID
 * @access  Public
 */
router.get('/:id', [
  param('id').isLength({ min: 1 }).trim().withMessage('Video ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const video = await YouTubeVideo.findOne({
      $or: [
        { _id: req.params.id },
        { videoId: req.params.id }
      ],
      isActive: true
    }).select('-__v');
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Increment view count
    await video.incrementViews();
    
    res.json({
      success: true,
      data: {
        video
      }
    });
    
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/youtube
 * @desc    Create new YouTube video (Admin only)
 * @access  Private
 */
router.post('/', adminAuth, [
  body('videoId').isLength({ min: 1 }).trim().withMessage('Video ID is required'),
  body('title').isLength({ min: 1, max: 200 }).trim().withMessage('Title is required and must be less than 200 characters'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('embedUrl').isURL().withMessage('Valid embed URL is required'),
  body('thumbnail').isURL().withMessage('Valid thumbnail URL is required'),
  body('category').optional().isIn(['tutorial', 'demo', 'presentation', 'interview', 'review', 'other']).withMessage('Invalid category'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('featured').optional().isBoolean().withMessage('Featured must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    const video = new YouTubeVideo(req.body);
    await video.save();
    
    res.status(201).json({
      success: true,
      message: 'Video added successfully',
      data: {
        video
      }
    });
    
  } catch (error) {
    console.error('Error creating video:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Video with this ID already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/youtube/:id
 * @desc    Update YouTube video (Admin only)
 * @access  Private
 */
router.put('/:id', adminAuth, [
  param('id').isLength({ min: 1 }).trim().withMessage('Video ID is required'),
  body('title').optional().isLength({ min: 1, max: 200 }).trim().withMessage('Title must be less than 200 characters'),
  body('description').optional().isLength({ max: 1000 }).trim().withMessage('Description must be less than 1000 characters'),
  body('category').optional().isIn(['tutorial', 'demo', 'presentation', 'interview', 'review', 'other']).withMessage('Invalid category'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    const video = await YouTubeVideo.findOneAndUpdate(
      {
        $or: [
          { _id: req.params.id },
          { videoId: req.params.id }
        ]
      },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Video updated successfully',
      data: {
        video
      }
    });
    
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/youtube/:id
 * @desc    Delete YouTube video (Admin only)
 * @access  Private
 */
router.delete('/:id', adminAuth, [
  param('id').isLength({ min: 1 }).trim().withMessage('Video ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    const video = await YouTubeVideo.findOneAndDelete({
      $or: [
        { _id: req.params.id },
        { videoId: req.params.id }
      ]
    });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/youtube/:id/click
 * @desc    Track video click
 * @access  Public
 */
router.post('/:id/click', [
  param('id').isLength({ min: 1 }).trim().withMessage('Video ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const video = await YouTubeVideo.findOne({
      $or: [
        { _id: req.params.id },
        { videoId: req.params.id }
      ],
      isActive: true
    });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Increment click count
    await video.incrementClicks();
    
    res.json({
      success: true,
      message: 'Click tracked successfully',
      data: {
        clicks: video.metrics.clicks
      }
    });
    
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track click',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/youtube/stats/overview
 * @desc    Get YouTube channel statistics
 * @access  Public
 */
router.get('/stats/overview', async (req, res) => {
  try {
    // Calculate stats from MongoDB data
    const totalVideos = await YouTubeVideo.countDocuments({ isActive: true });
    const totalViews = await YouTubeVideo.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$metrics.views' } } }
    ]);
    const totalClicks = await YouTubeVideo.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$metrics.clicks' } } }
    ]);
    
    // Category breakdown
    const categoryStats = await YouTubeVideo.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Most popular tags
    const tagStats = await YouTubeVideo.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalVideos,
          totalViews: totalViews[0]?.total || 0,
          totalClicks: totalClicks[0]?.total || 0,
          averageViewsPerVideo: totalVideos > 0 ? Math.round((totalViews[0]?.total || 0) / totalVideos) : 0
        },
        categories: categoryStats.map(cat => ({
          category: cat._id,
          count: cat.count,
          percentage: totalVideos > 0 ? ((cat.count / totalVideos) * 100).toFixed(1) : 0
        })),
        topTags: tagStats.map(tag => ({
          tag: tag._id,
          count: tag.count
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching YouTube stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch YouTube statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;