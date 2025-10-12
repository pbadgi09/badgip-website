/**
 * Blog Post Model
 * MongoDB schema for blog posts
 */

const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog post title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  
  excerpt: {
    type: String,
    required: [true, 'Blog post excerpt is required'],
    trim: true,
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  
  content: {
    type: String,
    required: [true, 'Blog post content is required']
  },
  
  author: {
    name: {
      type: String,
      required: true,
      default: 'Pranav Badgi'
    },
    email: {
      type: String,
      default: 'hello@pranavbadgi.com'
    },
    avatar: String
  },
  
  category: {
    type: String,
    required: [true, 'Blog post category is required'],
    enum: [
      'web-development',
      'javascript',
      'react',
      'node-js',
      'tutorial',
      'career',
      'technology',
      'opinion',
      'review',
      'other'
    ]
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  featuredImage: {
    url: {
      type: String,
      required: [true, 'Featured image is required']
    },
    alt: {
      type: String,
      required: true
    },
    caption: String
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
    caption: String
  }],
  
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  
  featured: {
    type: Boolean,
    default: false
  },
  
  readTime: {
    type: Number, // in minutes
    default: 1
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
    shares: {
      type: Number,
      default: 0
    },
    comments: {
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
    keywords: [String],
    canonicalUrl: String
  },
  
  publishedAt: {
    type: Date
  },
  
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for better query performance
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ featured: -1, publishedAt: -1 });
blogPostSchema.index({ 'seo.slug': 1 });
blogPostSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

// Virtual for URL
blogPostSchema.virtual('url').get(function() {
  return `/blog/${this.seo.slug}`;
});

// Virtual for formatted publish date
blogPostSchema.virtual('formattedDate').get(function() {
  if (this.publishedAt) {
    return this.publishedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return null;
});

// Calculate read time based on content length
blogPostSchema.pre('save', function(next) {
  if (this.content) {
    // Average reading speed: 200 words per minute
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / wordsPerMinute);
  }
  
  // Generate slug from title if not provided
  if (!this.seo.slug && this.title) {
    this.seo.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  // Set publishedAt when status changes to published
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Update lastModified
  this.lastModified = new Date();
  
  next();
});

// Static method to get published posts
blogPostSchema.statics.getPublished = function(limit = 10, skip = 0) {
  return this.find({ 
    status: 'published' 
  })
  .sort({ publishedAt: -1 })
  .limit(limit)
  .skip(skip)
  .select('-content'); // Exclude full content for list views
};

// Static method to get featured posts
blogPostSchema.statics.getFeatured = function(limit = 3) {
  return this.find({ 
    status: 'published',
    featured: true 
  })
  .sort({ publishedAt: -1 })
  .limit(limit)
  .select('-content');
};

// Static method to get posts by category
blogPostSchema.statics.getByCategory = function(category, limit = 10, skip = 0) {
  return this.find({ 
    status: 'published',
    category: category 
  })
  .sort({ publishedAt: -1 })
  .limit(limit)
  .skip(skip)
  .select('-content');
};

// Static method to search posts
blogPostSchema.statics.search = function(query, limit = 10) {
  return this.find({
    status: 'published',
    $text: { $search: query }
  }, {
    score: { $meta: 'textScore' }
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
  .select('-content');
};

// Instance method to increment views
blogPostSchema.methods.incrementViews = function() {
  this.metrics.views += 1;
  return this.save();
};

// Instance method to increment likes
blogPostSchema.methods.incrementLikes = function() {
  this.metrics.likes += 1;
  return this.save();
};

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

module.exports = BlogPost;