/**
 * Image Associations API Routes
 * Handles linking images to blog posts, projects, and other content
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Image = require('../models/Image');
const ImageAssociation = require('../models/ImageAssociation');
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
 * @route   POST /api/image-associations
 * @desc    Associate image with content (blog/project)
 * @access  Private (Admin only)
 */
router.post('/', adminAuth, [
  body('imageId').isMongoId().withMessage('Valid image ID is required'),
  body('contentType').isIn(['blog', 'project', 'page', 'general']).withMessage('Invalid content type'),
  body('contentId').isLength({ min: 1 }).trim().withMessage('Content ID is required'),
  body('role').optional().isIn(['featured', 'gallery', 'inline', 'background', 'icon']).withMessage('Invalid role'),
  body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),
  body('caption').optional().isLength({ max: 300 }).trim().withMessage('Caption cannot exceed 300 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { imageId, contentType, contentId, role = 'gallery', displayOrder = 0, caption = '' } = req.body;
    
    // Verify image exists
    const image = await Image.findById(imageId);
    if (!image || image.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Create association
    const association = await ImageAssociation.associate(
      imageId, 
      contentType, 
      contentId, 
      role, 
      displayOrder, 
      caption
    );
    
    // Populate the image data for response
    await association.populate('imageId');
    
    res.status(201).json({
      success: true,
      message: 'Image associated successfully',
      data: { association }
    });
    
  } catch (error) {
    console.error('Error associating image:', error);
    
    if (error.message.includes('duplicate')) {
      return res.status(400).json({
        success: false,
        message: 'Image is already associated with this content'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to associate image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/image-associations/content/:contentType/:contentId
 * @desc    Get all images for a specific content item
 * @access  Public
 */
router.get('/content/:contentType/:contentId', [
  param('contentType').isIn(['blog', 'project', 'page', 'general']).withMessage('Invalid content type'),
  param('contentId').isLength({ min: 1 }).trim().withMessage('Content ID is required'),
  query('role').optional().isIn(['featured', 'gallery', 'inline', 'background', 'icon']).withMessage('Invalid role')
], handleValidationErrors, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { role } = req.query;
    
    const associations = await ImageAssociation.getImagesForContent(contentType, contentId, role);
    
    // Filter out deleted images
    const validAssociations = associations.filter(assoc => 
      assoc.imageId && assoc.imageId.status === 'active'
    );
    
    res.json({
      success: true,
      data: {
        associations: validAssociations,
        count: validAssociations.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching content images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/image-associations/image/:imageId
 * @desc    Get all content items using a specific image
 * @access  Private (Admin only)
 */
router.get('/image/:imageId', adminAuth, [
  param('imageId').isMongoId().withMessage('Valid image ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const associations = await ImageAssociation.getContentForImage(req.params.imageId);
    
    res.json({
      success: true,
      data: {
        associations,
        count: associations.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching image associations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch image associations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/image-associations/featured/:contentType/:contentId
 * @desc    Get featured image for content
 * @access  Public
 */
router.get('/featured/:contentType/:contentId', [
  param('contentType').isIn(['blog', 'project', 'page', 'general']).withMessage('Invalid content type'),
  param('contentId').isLength({ min: 1 }).trim().withMessage('Content ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    
    const association = await ImageAssociation.getFeaturedImage(contentType, contentId);
    
    if (!association || !association.imageId || association.imageId.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'No featured image found'
      });
    }
    
    res.json({
      success: true,
      data: { association }
    });
    
  } catch (error) {
    console.error('Error fetching featured image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/image-associations/:imageId/:contentType/:contentId
 * @desc    Update image association
 * @access  Private (Admin only)
 */
router.put('/:imageId/:contentType/:contentId', adminAuth, [
  param('imageId').isMongoId().withMessage('Valid image ID is required'),
  param('contentType').isIn(['blog', 'project', 'page', 'general']).withMessage('Invalid content type'),
  param('contentId').isLength({ min: 1 }).trim().withMessage('Content ID is required'),
  body('role').optional().isIn(['featured', 'gallery', 'inline', 'background', 'icon']).withMessage('Invalid role'),
  body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),
  body('caption').optional().isLength({ max: 300 }).trim().withMessage('Caption cannot exceed 300 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { imageId, contentType, contentId } = req.params;
    const updateData = req.body;
    
    const association = await ImageAssociation.findOneAndUpdate(
      { imageId, contentType, contentId },
      updateData,
      { new: true, runValidators: true }
    ).populate('imageId');
    
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Association updated successfully',
      data: { association }
    });
    
  } catch (error) {
    console.error('Error updating association:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update association',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/image-associations/reorder/:contentType/:contentId
 * @desc    Update display order for multiple images
 * @access  Private (Admin only)
 */
router.put('/reorder/:contentType/:contentId', adminAuth, [
  param('contentType').isIn(['blog', 'project', 'page', 'general']).withMessage('Invalid content type'),
  param('contentId').isLength({ min: 1 }).trim().withMessage('Content ID is required'),
  body('imageOrders').isArray({ min: 1 }).withMessage('Image orders array is required'),
  body('imageOrders.*.imageId').isMongoId().withMessage('Valid image ID is required'),
  body('imageOrders.*.displayOrder').isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { imageOrders } = req.body;
    
    await ImageAssociation.updateDisplayOrder(contentType, contentId, imageOrders);
    
    // Return updated associations
    const associations = await ImageAssociation.getImagesForContent(contentType, contentId);
    
    res.json({
      success: true,
      message: 'Display order updated successfully',
      data: { associations }
    });
    
  } catch (error) {
    console.error('Error updating display order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update display order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/image-associations/:imageId/:contentType/:contentId
 * @desc    Remove image association
 * @access  Private (Admin only)
 */
router.delete('/:imageId/:contentType/:contentId', adminAuth, [
  param('imageId').isMongoId().withMessage('Valid image ID is required'),
  param('contentType').isIn(['blog', 'project', 'page', 'general']).withMessage('Invalid content type'),
  param('contentId').isLength({ min: 1 }).trim().withMessage('Content ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { imageId, contentType, contentId } = req.params;
    
    const result = await ImageAssociation.disassociate(imageId, contentType, contentId);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Association removed successfully'
    });
    
  } catch (error) {
    console.error('Error removing association:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove association',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/image-associations/bulk
 * @desc    Bulk associate images with content
 * @access  Private (Admin only)
 */
router.post('/bulk', adminAuth, [
  body('associations').isArray({ min: 1 }).withMessage('Associations array is required'),
  body('associations.*.imageId').isMongoId().withMessage('Valid image ID is required'),
  body('associations.*.contentType').isIn(['blog', 'project', 'page', 'general']).withMessage('Invalid content type'),
  body('associations.*.contentId').isLength({ min: 1 }).trim().withMessage('Content ID is required'),
  body('associations.*.role').optional().isIn(['featured', 'gallery', 'inline', 'background', 'icon']).withMessage('Invalid role')
], handleValidationErrors, async (req, res) => {
  try {
    const { associations } = req.body;
    const results = [];
    
    for (const assoc of associations) {
      try {
        const association = await ImageAssociation.associate(
          assoc.imageId,
          assoc.contentType,
          assoc.contentId,
          assoc.role || 'gallery',
          assoc.displayOrder || 0,
          assoc.caption || ''
        );
        
        await association.populate('imageId');
        results.push({ success: true, association });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          imageId: assoc.imageId,
          contentType: assoc.contentType,
          contentId: assoc.contentId
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    res.status(201).json({
      success: true,
      message: `Bulk association completed: ${successCount} successful, ${failureCount} failed`,
      data: { results }
    });
    
  } catch (error) {
    console.error('Error in bulk association:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk association',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;