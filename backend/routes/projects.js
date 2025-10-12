/**
 * Projects API Routes
 * CRUD operations for portfolio projects
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Project = require('../models/Project');

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
 * @route   GET /api/projects
 * @desc    Get all projects with pagination and filtering
 * @access  Public
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isIn(['web', 'mobile', 'desktop', 'api', 'other']).withMessage('Invalid category'),
  query('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  query('status').optional().isIn(['completed', 'in-progress', 'planned']).withMessage('Invalid status')
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { visibility: 'public' };
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.featured !== undefined) {
      filter.featured = req.query.featured === 'true';
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.technology) {
      filter.technologies = { $in: [req.query.technology] };
    }
    
    // Execute query
    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort({ featured: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .select('-__v'),
      Project.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: {
        projects,
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
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/projects/featured
 * @desc    Get featured projects
 * @access  Public
 */
router.get('/featured', [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], handleValidationErrors, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    const projects = await Project.getFeatured(limit);
    
    res.json({
      success: true,
      data: {
        projects,
        count: projects.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching featured projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured projects',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/projects/categories
 * @desc    Get project categories with counts
 * @access  Public
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await Project.aggregate([
      { $match: { visibility: 'public' } },
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
 * @route   GET /api/projects/technologies
 * @desc    Get all technologies used in projects
 * @access  Public
 */
router.get('/technologies', async (req, res) => {
  try {
    const technologies = await Project.aggregate([
      { $match: { visibility: 'public' } },
      { $unwind: '$technologies' },
      { $group: { _id: '$technologies', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);
    
    res.json({
      success: true,
      data: {
        technologies: technologies.map(tech => ({
          name: tech._id,
          count: tech.count
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching technologies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch technologies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/projects/:slug
 * @desc    Get single project by slug
 * @access  Public
 */
router.get('/:slug', [
  param('slug').isLength({ min: 1 }).trim().withMessage('Slug is required')
], handleValidationErrors, async (req, res) => {
  try {
    const project = await Project.findOne({
      'seo.slug': req.params.slug,
      visibility: 'public'
    }).select('-__v');
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Increment view count
    await project.incrementViews();
    
    res.json({
      success: true,
      data: {
        project
      }
    });
    
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create new project (Admin only - to be implemented)
 * @access  Private
 */
router.post('/', [
  body('title').isLength({ min: 1, max: 100 }).trim().withMessage('Title is required and must be less than 100 characters'),
  body('description').isLength({ min: 1, max: 500 }).trim().withMessage('Description is required and must be less than 500 characters'),
  body('technologies').isArray({ min: 1 }).withMessage('At least one technology is required'),
  body('category').isIn(['web', 'mobile', 'desktop', 'api', 'other']).withMessage('Invalid category'),
  body('status').optional().isIn(['completed', 'in-progress', 'planned']).withMessage('Invalid status')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    const project = new Project(req.body);
    await project.save();
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: {
        project
      }
    });
    
  } catch (error) {
    console.error('Error creating project:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Project with this slug already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/projects/:slug
 * @desc    Update project (Admin only - to be implemented)
 * @access  Private
 */
router.put('/:slug', [
  param('slug').isLength({ min: 1 }).trim().withMessage('Slug is required'),
  body('title').optional().isLength({ min: 1, max: 100 }).trim().withMessage('Title must be less than 100 characters'),
  body('description').optional().isLength({ min: 1, max: 500 }).trim().withMessage('Description must be less than 500 characters'),
  body('technologies').optional().isArray({ min: 1 }).withMessage('At least one technology is required'),
  body('category').optional().isIn(['web', 'mobile', 'desktop', 'api', 'other']).withMessage('Invalid category'),
  body('status').optional().isIn(['completed', 'in-progress', 'planned']).withMessage('Invalid status')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    const project = await Project.findOneAndUpdate(
      { 'seo.slug': req.params.slug },
      { ...req.body, lastModified: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      data: {
        project
      }
    });
    
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/projects/:slug
 * @desc    Delete project (Admin only - to be implemented)
 * @access  Private
 */
router.delete('/:slug', [
  param('slug').isLength({ min: 1 }).trim().withMessage('Slug is required')
], handleValidationErrors, async (req, res) => {
  try {
    // TODO: Add authentication middleware for admin access
    
    const project = await Project.findOneAndDelete({
      'seo.slug': req.params.slug
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/projects/:slug/like
 * @desc    Like/unlike a project
 * @access  Public
 */
router.post('/:slug/like', [
  param('slug').isLength({ min: 1 }).trim().withMessage('Slug is required')
], handleValidationErrors, async (req, res) => {
  try {
    const project = await Project.findOne({
      'seo.slug': req.params.slug,
      visibility: 'public'
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Simple like increment (in a real app, you'd track user likes)
    project.metrics.likes += 1;
    await project.save();
    
    res.json({
      success: true,
      message: 'Project liked successfully',
      data: {
        likes: project.metrics.likes
      }
    });
    
  } catch (error) {
    console.error('Error liking project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;