/**
 * Blog API Routes
 * CRUD operations for blog posts
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const BlogPost = require('../models/BlogPost');
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
 * @route   GET /api/blog
 * @desc    Get all published blog posts with pagination
 * @access  Public
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isIn([
    'web-development', 'javascript', 'react', 'node-js', 'tutorial',
    'career', 'technology', 'opinion', 'review', 'other'
  ]).withMessage('Invalid category'),
  query('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  query('search').optional().isLength({ min: 2, max: 100 }).trim().withMessage('Search query must be between 2 and 100 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let posts;
    let total;
    
    // Handle search
    if (req.query.search) {
      posts = await BlogPost.search(req.query.search, limit);
      total = posts.length;
    } else {
      // Build filter object
      const filter = { status: 'published' };
      
      if (req.query.category) {
        filter.category = req.query.category;
      }
      
      if (req.query.featured !== undefined) {
        filter.featured = req.query.featured === 'true';
      }
      
      // Execute query
      [posts, total] = await Promise.all([
        BlogPost.find(filter)
          .sort({ publishedAt: -1 })
          .limit(limit)
          .skip(skip)
          .select('-content -__v'),
        BlogPost.countDocuments(filter)
      ]);
    }
    
    res.json({
      success: true,
      data: {
        posts,
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
    console.error('Error fetching blog posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/blog/featured
 * @desc    Get featured blog posts
 * @access  Public
 */
router.get('/featured', [
  query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10')
], handleValidationErrors, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    
    const posts = await BlogPost.getFeatured(limit);
    
    res.json({
      success: true,
      data: {
        posts,
        count: posts.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/blog/categories
 * @desc    Get blog categories with post counts
 * @access  Public
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await BlogPost.aggregate([
      { $match: { status: 'published' } },
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
 * @route   GET /api/blog/tags
 * @desc    Get all blog tags
 * @access  Public
 */
router.get('/tags', async (req, res) => {
  try {
    const tags = await BlogPost.aggregate([
      { $match: { status: 'published' } },
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
 * @route   GET /api/blog/:slug
 * @desc    Get single blog post by slug
 * @access  Public
 */
router.get('/:slug', [
  param('slug').isLength({ min: 1 }).trim().withMessage('Slug is required')
], handleValidationErrors, async (req, res) => {
  try {
    const post = await BlogPost.findOne({
      'seo.slug': req.params.slug,
      status: 'published'
    }).select('-__v');
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    // Increment view count
    await post.incrementViews();
    
    res.json({
      success: true,
      data: {
        post
      }
    });
    
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/blog
 * @desc    Create new blog post (Admin only)
 * @access  Private
 */
router.post('/', adminAuth, [
  body('title').isLength({ min: 1, max: 200 }).trim().withMessage('Title is required and must be less than 200 characters'),
  body('content').isLength({ min: 1 }).trim().withMessage('Content is required'),
  body('excerpt').isLength({ min: 1, max: 300 }).trim().withMessage('Excerpt is required and must be less than 300 characters'),
  body('category').isIn([
    'web-development', 'javascript', 'react', 'node-js', 'tutorial',
    'career', 'technology', 'opinion', 'review', 'other'
  ]).withMessage('Invalid category'),
  body('status').optional().isIn(['draft', 'published']).withMessage('Invalid status'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('featured').optional().isBoolean().withMessage('Featured must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    const postData = {
      ...req.body,
      publishedAt: req.body.status === 'published' ? new Date() : undefined
    };
    
    const post = new BlogPost(postData);
    await post.save();
    
    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: {
        post
      }
    });
    
  } catch (error) {
    console.error('Error creating blog post:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Blog post with this slug already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/blog/:slug
 * @desc    Update blog post (Admin only)
 * @access  Private
 */
router.put('/:slug', adminAuth, [
  param('slug').isLength({ min: 1 }).trim().withMessage('Slug is required'),
  body('title').optional().isLength({ min: 1, max: 200 }).trim().withMessage('Title must be less than 200 characters'),
  body('content').optional().isLength({ min: 1 }).trim().withMessage('Content cannot be empty'),
  body('excerpt').optional().isLength({ min: 1, max: 300 }).trim().withMessage('Excerpt must be less than 300 characters'),
  body('category').optional().isIn([
    'web-development', 'javascript', 'react', 'node-js', 'tutorial',
    'career', 'technology', 'opinion', 'review', 'other'
  ]).withMessage('Invalid category'),
  body('status').optional().isIn(['draft', 'published']).withMessage('Invalid status'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('featured').optional().isBoolean().withMessage('Featured must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    const updateData = { ...req.body };
    
    // If status is being changed to published and publishedAt is not set, set it now
    if (req.body.status === 'published') {
      const existingPost = await BlogPost.findOne({ 'seo.slug': req.params.slug });
      if (existingPost && (!existingPost.publishedAt || existingPost.status !== 'published')) {
        updateData.publishedAt = new Date();
      }
    }
    
    const post = await BlogPost.findOneAndUpdate(
      { 'seo.slug': req.params.slug },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Blog post updated successfully',
      data: {
        post
      }
    });
    
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/blog/:slug
 * @desc    Delete blog post (Admin only)
 * @access  Private
 */
router.delete('/:slug', adminAuth, [
  param('slug').isLength({ min: 1 }).trim().withMessage('Slug is required')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    const post = await BlogPost.findOneAndDelete({
      'seo.slug': req.params.slug
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/blog/:slug/like
 * @desc    Like/unlike a blog post
 * @access  Public
 */
router.post('/:slug/like', [
  param('slug').isLength({ min: 1 }).trim().withMessage('Slug is required')
], handleValidationErrors, async (req, res) => {
  try {
    const post = await BlogPost.findOne({
      'seo.slug': req.params.slug,
      status: 'published'
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    // Simple like increment (in a real app, you'd track user likes)
    await post.incrementLikes();
    
    res.json({
      success: true,
      message: 'Blog post liked successfully',
      data: {
        likes: post.metrics.likes
      }
    });
    
  } catch (error) {
    console.error('Error liking blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;