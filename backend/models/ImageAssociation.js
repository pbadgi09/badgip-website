/**
 * ImageAssociation Model
 * Links images to blog posts, projects, or other content
 */

const mongoose = require('mongoose');

const imageAssociationSchema = new mongoose.Schema({
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image',
    required: [true, 'Image ID is required']
  },
  
  contentType: {
    type: String,
    required: [true, 'Content type is required'],
    enum: ['blog', 'project', 'page', 'general'],
    lowercase: true
  },
  
  contentId: {
    type: String,
    required: [true, 'Content ID is required'],
    trim: true
  },
  
  // Role of the image in the content
  role: {
    type: String,
    enum: ['featured', 'gallery', 'inline', 'background', 'icon'],
    default: 'gallery'
  },
  
  // Display order for galleries
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // Custom caption for this specific association
  caption: {
    type: String,
    trim: true,
    maxlength: [300, 'Caption cannot exceed 300 characters']
  },
  
  // When this association was created
  associatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Who created this association
  associatedBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient queries
imageAssociationSchema.index({ imageId: 1, contentType: 1, contentId: 1 }, { unique: true });
imageAssociationSchema.index({ contentType: 1, contentId: 1 });
imageAssociationSchema.index({ imageId: 1 });
imageAssociationSchema.index({ contentType: 1, role: 1 });

// Static method to get all images for a content item
imageAssociationSchema.statics.getImagesForContent = function(contentType, contentId, role = null) {
  const query = { contentType, contentId };
  if (role) {
    query.role = role;
  }
  
  return this.find(query)
    .populate('imageId')
    .sort({ displayOrder: 1, associatedAt: 1 });
};

// Static method to get all content items using an image
imageAssociationSchema.statics.getContentForImage = function(imageId) {
  return this.find({ imageId })
    .sort({ associatedAt: -1 });
};

// Static method to get featured image for content
imageAssociationSchema.statics.getFeaturedImage = function(contentType, contentId) {
  return this.findOne({ 
    contentType, 
    contentId, 
    role: 'featured' 
  }).populate('imageId');
};

// Static method to associate image with content
imageAssociationSchema.statics.associate = async function(imageId, contentType, contentId, role = 'gallery', displayOrder = 0, caption = '') {
  try {
    // Check if association already exists
    const existing = await this.findOne({ imageId, contentType, contentId });
    if (existing) {
      // Update existing association
      existing.role = role;
      existing.displayOrder = displayOrder;
      existing.caption = caption;
      return await existing.save();
    }
    
    // Create new association
    const association = new this({
      imageId,
      contentType,
      contentId,
      role,
      displayOrder,
      caption
    });
    
    return await association.save();
  } catch (error) {
    throw new Error(`Failed to associate image: ${error.message}`);
  }
};

// Static method to remove association
imageAssociationSchema.statics.disassociate = async function(imageId, contentType, contentId) {
  return await this.deleteOne({ imageId, contentType, contentId });
};

// Static method to update display order for multiple images
imageAssociationSchema.statics.updateDisplayOrder = async function(contentType, contentId, imageOrders) {
  const bulkOps = imageOrders.map(({ imageId, displayOrder }) => ({
    updateOne: {
      filter: { imageId, contentType, contentId },
      update: { displayOrder }
    }
  }));
  
  return await this.bulkWrite(bulkOps);
};

// Static method to get image usage statistics
imageAssociationSchema.statics.getUsageStats = async function(imageId) {
  const associations = await this.find({ imageId });
  
  const stats = {
    totalUsages: associations.length,
    byContentType: {},
    byRole: {}
  };
  
  associations.forEach(assoc => {
    // Count by content type
    stats.byContentType[assoc.contentType] = (stats.byContentType[assoc.contentType] || 0) + 1;
    
    // Count by role
    stats.byRole[assoc.role] = (stats.byRole[assoc.role] || 0) + 1;
  });
  
  return stats;
};

// Pre-save middleware to update image usage count
imageAssociationSchema.post('save', async function() {
  try {
    const Image = mongoose.model('Image');
    const image = await Image.findById(this.imageId);
    if (image) {
      const totalAssociations = await ImageAssociation.countDocuments({ imageId: this.imageId });
      image.usageCount = totalAssociations;
      await image.save();
    }
  } catch (error) {
    console.error('Error updating image usage count:', error);
  }
});

// Pre-remove middleware to update image usage count
imageAssociationSchema.post('deleteOne', { document: false, query: true }, async function() {
  try {
    const association = await this.model.findOne(this.getQuery());
    if (association) {
      const Image = mongoose.model('Image');
      const image = await Image.findById(association.imageId);
      if (image) {
        const totalAssociations = await ImageAssociation.countDocuments({ imageId: association.imageId });
        image.usageCount = totalAssociations;
        await image.save();
      }
    }
  } catch (error) {
    console.error('Error updating image usage count on delete:', error);
  }
});

const ImageAssociation = mongoose.model('ImageAssociation', imageAssociationSchema);

module.exports = ImageAssociation;