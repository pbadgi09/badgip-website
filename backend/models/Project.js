/**
 * Project Model
 * MongoDB schema for portfolio projects
 */

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  longDescription: {
    type: String,
    trim: true,
    maxlength: [2000, 'Long description cannot exceed 2000 characters']
  },
  
  technologies: [{
    type: String,
    required: true,
    trim: true
  }],
  
  category: {
    type: String,
    required: [true, 'Project category is required'],
    enum: ['web', 'mobile', 'desktop', 'api', 'other'],
    default: 'web'
  },
  
  status: {
    type: String,
    required: true,
    enum: ['completed', 'in-progress', 'planned'],
    default: 'completed'
  },
  
  featured: {
    type: Boolean,
    default: false
  },
  
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      required: true
    },
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  links: {
    live: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Live URL must be a valid HTTP/HTTPS URL'
      }
    },
    github: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/(www\.)?github\.com\/.+/.test(v);
        },
        message: 'GitHub URL must be a valid GitHub repository URL'
      }
    },
    demo: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Demo URL must be a valid HTTP/HTTPS URL'
      }
    }
  },
  
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    stars: {
      type: Number,
      default: 0
    }
  },
  
  seo: {
    slug: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    keywords: [String]
  },
  
  visibility: {
    type: String,
    enum: ['public', 'private', 'draft'],
    default: 'public'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for better query performance
projectSchema.index({ featured: -1, createdAt: -1 });
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ 'seo.slug': 1 });
projectSchema.index({ technologies: 1 });

// Virtual for primary image
projectSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    const primary = this.images.find(img => img.isPrimary);
    return primary || this.images[0];
  }
  return null;
});

// Generate slug from title before saving
projectSchema.pre('save', function(next) {
  if ((!this.seo.slug || this.seo.slug === '') && this.title) {
    this.seo.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  // Ensure only one primary image
  if (this.images && this.images.length > 0) {
    let primaryCount = 0;
    this.images.forEach((img, index) => {
      if (img.isPrimary) {
        primaryCount++;
        if (primaryCount > 1) {
          img.isPrimary = false;
        }
      }
    });
    
    // If no primary image is set, make the first one primary
    if (primaryCount === 0) {
      this.images[0].isPrimary = true;
    }
  }
  
  next();
});

// Static method to get featured projects
projectSchema.statics.getFeatured = function(limit = 6) {
  return this.find({ 
    featured: true, 
    visibility: 'public' 
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get projects by category
projectSchema.statics.getByCategory = function(category, limit = 10) {
  return this.find({ 
    category: category, 
    visibility: 'public' 
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Instance method to increment views
projectSchema.methods.incrementViews = function() {
  this.metrics.views += 1;
  return this.save();
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;