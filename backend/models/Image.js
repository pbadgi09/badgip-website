/**
 * Image Model
 * MongoDB schema for managing uploaded images
 */

const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Image filename is required'],
    trim: true
  },
  
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  
  path: {
    type: String,
    required: [true, 'Image path is required'],
    trim: true
  },
  
  thumbnailPath: {
    type: String,
    trim: true
  },
  
  title: {
    type: String,
    required: [true, 'Image title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  alt: {
    type: String,
    required: [true, 'Alt text is required for accessibility'],
    trim: true,
    maxlength: [200, 'Alt text cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  },
  
  size: {
    type: Number,
    required: [true, 'File size is required']
  },
  
  dimensions: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  
  uploadedBy: {
    type: String,
    default: 'admin'
  },
  
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  // Track which content items use this image
  usageCount: {
    type: Number,
    default: 0
  },
  
  // SEO and metadata
  seo: {
    keywords: [String],
    category: {
      type: String,
      enum: ['blog', 'project', 'general', 'ui', 'screenshot', 'photo', 'icon'],
      default: 'general'
    }
  },
  
  // Status for moderation or processing
  status: {
    type: String,
    enum: ['processing', 'active', 'archived', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for better query performance
imageSchema.index({ uploadedAt: -1 });
imageSchema.index({ tags: 1 });
imageSchema.index({ 'seo.category': 1 });
imageSchema.index({ status: 1 });
imageSchema.index({ title: 'text', alt: 'text', description: 'text' });

// Virtual for public URL
imageSchema.virtual('url').get(function() {
  return this.path.replace('frontend', '');
});

// Virtual for thumbnail URL
imageSchema.virtual('thumbnailUrl').get(function() {
  if (this.thumbnailPath) {
    return this.thumbnailPath.replace('frontend', '');
  }
  return this.url; // Fallback to original if no thumbnail
});

// Virtual for formatted file size
imageSchema.virtual('formattedSize').get(function() {
  if (this.size < 1024) {
    return this.size + ' B';
  } else if (this.size < 1024 * 1024) {
    return (this.size / 1024).toFixed(1) + ' KB';
  } else {
    return (this.size / (1024 * 1024)).toFixed(1) + ' MB';
  }
});

// Static method to get images by category
imageSchema.statics.getByCategory = function(category, limit = 20, skip = 0) {
  return this.find({ 
    'seo.category': category,
    status: 'active'
  })
  .sort({ uploadedAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to search images
imageSchema.statics.search = function(query, limit = 20) {
  return this.find({
    status: 'active',
    $text: { $search: query }
  }, {
    score: { $meta: 'textScore' }
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit);
};

// Static method to get recent images
imageSchema.statics.getRecent = function(limit = 20, skip = 0) {
  return this.find({ status: 'active' })
    .sort({ uploadedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Instance method to increment usage count
imageSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Instance method to decrement usage count
imageSchema.methods.decrementUsage = function() {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
  }
  return this.save();
};

// Pre-save middleware to generate filename if not provided
imageSchema.pre('save', function(next) {
  // Generate filename based on title and timestamp if not provided
  if (!this.filename && this.title) {
    const timestamp = Date.now();
    const slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    // Extract extension from original name or mime type
    let extension = 'jpg';
    if (this.originalName) {
      const ext = this.originalName.split('.').pop().toLowerCase();
      extension = ext;
    } else if (this.mimeType) {
      extension = this.mimeType.split('/')[1];
    }
    
    this.filename = `${slug}-${timestamp}.${extension}`;
  }
  
  next();
});

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;