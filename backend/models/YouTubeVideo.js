/**
 * YouTube Video Model
 * MongoDB schema for YouTube videos
 */

const mongoose = require('mongoose');

const youtubeVideoSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: [true, 'Video ID is required'],
    unique: true,
    trim: true
  },
  
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  url: {
    type: String,
    required: [true, 'Video URL is required'],
    validate: {
      validator: function(v) {
        return /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/).+/.test(v);
      },
      message: 'URL must be a valid YouTube URL'
    }
  },
  
  embedUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/(www\.)?youtube\.com\/embed\/.+/.test(v);
      },
      message: 'Embed URL must be a valid YouTube embed URL'
    }
  },
  
  thumbnail: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp).*/.test(v);
      },
      message: 'Thumbnail must be a valid image URL'
    }
  },
  
  thumbnailMedium: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp).*/.test(v);
      },
      message: 'Thumbnail medium must be a valid image URL'
    }
  },
  
  author: {
    type: String,
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  
  category: {
    type: String,
    enum: ['tutorial', 'demo', 'presentation', 'interview', 'review', 'other'],
    default: 'other'
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  featured: {
    type: Boolean,
    default: false
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
    clicks: {
      type: Number,
      default: 0
    }
  },
  
  publishedAt: {
    type: Date,
    default: Date.now
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for better query performance
youtubeVideoSchema.index({ featured: -1, publishedAt: -1 });
youtubeVideoSchema.index({ category: 1, isActive: 1 });
youtubeVideoSchema.index({ tags: 1 });
youtubeVideoSchema.index({ videoId: 1 });

// Virtual for formatted view count
youtubeVideoSchema.virtual('formattedViews').get(function() {
  const views = this.metrics.views;
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
});

// Virtual for video embed HTML
youtubeVideoSchema.virtual('embedHtml').get(function() {
  return `<iframe width="560" height="315" src="${this.embedUrl}" frameborder="0" allowfullscreen></iframe>`;
});

// Static method to get featured videos
youtubeVideoSchema.statics.getFeatured = function(limit = 6) {
  return this.find({ 
    featured: true, 
    isActive: true 
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

// Static method to get videos by category
youtubeVideoSchema.statics.getByCategory = function(category, limit = 10) {
  return this.find({ 
    category: category, 
    isActive: true 
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

// Static method to search videos
youtubeVideoSchema.statics.search = function(searchTerm, limit = 10) {
  const searchRegex = new RegExp(searchTerm, 'i');
  return this.find({
    isActive: true,
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } },
      { author: searchRegex }
    ]
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

// Instance method to increment views
youtubeVideoSchema.methods.incrementViews = function() {
  this.metrics.views += 1;
  return this.save();
};

// Instance method to increment clicks
youtubeVideoSchema.methods.incrementClicks = function() {
  this.metrics.clicks += 1;
  return this.save();
};

// Pre-save middleware to ensure only one featured video per category
youtubeVideoSchema.pre('save', async function(next) {
  // If this video is being set as featured, remove featured status from other videos in the same category
  if (this.featured && this.isModified('featured')) {
    await this.constructor.updateMany(
      { 
        category: this.category, 
        featured: true, 
        _id: { $ne: this._id } 
      },
      { featured: false }
    );
  }
  next();
});

const YouTubeVideo = mongoose.model('YouTubeVideo', youtubeVideoSchema);

module.exports = YouTubeVideo;