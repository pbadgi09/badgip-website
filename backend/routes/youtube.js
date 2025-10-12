/**
 * YouTube API Routes
 * Fetch and manage YouTube video data
 */

const express = require('express');
const { query, validationResult } = require('express-validator');

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
 * Sample video data (in production, this would come from YouTube API)
 */
const sampleVideos = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'Building a Modern Portfolio Website with React and Node.js',
    description: 'Learn how to create a stunning portfolio website using React for the frontend and Node.js for the backend. We\'ll cover responsive design, animations, and deployment.',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '15:42',
    publishedAt: '2024-01-15T10:00:00Z',
    viewCount: 12450,
    likeCount: 892,
    tags: ['react', 'nodejs', 'portfolio', 'web-development'],
    category: 'tutorial'
  },
  {
    id: 'abc123xyz',
    title: 'JavaScript Tips and Tricks for Better Code',
    description: 'Discover advanced JavaScript techniques that will make your code cleaner, more efficient, and easier to maintain. Perfect for intermediate developers.',
    thumbnail: 'https://img.youtube.com/vi/abc123xyz/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=abc123xyz',
    embedUrl: 'https://www.youtube.com/embed/abc123xyz',
    duration: '12:18',
    publishedAt: '2024-01-10T14:30:00Z',
    viewCount: 8750,
    likeCount: 634,
    tags: ['javascript', 'tips', 'best-practices', 'coding'],
    category: 'tutorial'
  },
  {
    id: 'def456uvw',
    title: 'Setting Up Your Development Environment for 2024',
    description: 'A complete guide to setting up a modern development environment with the latest tools and workflows for maximum productivity.',
    thumbnail: 'https://img.youtube.com/vi/def456uvw/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=def456uvw',
    embedUrl: 'https://www.youtube.com/embed/def456uvw',
    duration: '18:35',
    publishedAt: '2024-01-05T09:15:00Z',
    viewCount: 15620,
    likeCount: 1247,
    tags: ['development', 'tools', 'setup', 'productivity'],
    category: 'setup'
  },
  {
    id: 'ghi789rst',
    title: 'CSS Grid vs Flexbox: When to Use What',
    description: 'Understanding the differences between CSS Grid and Flexbox, and when to use each layout method for optimal results.',
    thumbnail: 'https://img.youtube.com/vi/ghi789rst/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=ghi789rst',
    embedUrl: 'https://www.youtube.com/embed/ghi789rst',
    duration: '10:27',
    publishedAt: '2024-01-02T16:45:00Z',
    viewCount: 6890,
    likeCount: 445,
    tags: ['css', 'grid', 'flexbox', 'layout'],
    category: 'tutorial'
  },
  {
    id: 'jkl012mno',
    title: 'My Web Development Journey: From Beginner to Full Stack',
    description: 'Sharing my personal journey in web development, the challenges I faced, and the resources that helped me become a full-stack developer.',
    thumbnail: 'https://img.youtube.com/vi/jkl012mno/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=jkl012mno',
    embedUrl: 'https://www.youtube.com/embed/jkl012mno',
    duration: '22:14',
    publishedAt: '2023-12-28T11:20:00Z',
    viewCount: 18950,
    likeCount: 1689,
    tags: ['career', 'journey', 'motivation', 'web-development'],
    category: 'personal'
  }
];

/**
 * Format video duration from seconds to MM:SS format
 */
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format view count for display
 */
const formatViewCount = (count) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

/**
 * Format relative time (e.g., "2 days ago")
 */
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  } else {
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  }
};

/**
 * @route   GET /api/youtube
 * @desc    Get YouTube videos with pagination and filtering
 * @access  Public
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  query('category').optional().isIn(['tutorial', 'setup', 'personal', 'review']).withMessage('Invalid category'),
  query('sort').optional().isIn(['latest', 'popular', 'oldest']).withMessage('Invalid sort option')
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const sort = req.query.sort || 'latest';
    
    // Filter videos by category if specified
    let filteredVideos = category 
      ? sampleVideos.filter(video => video.category === category)
      : [...sampleVideos];
    
    // Sort videos
    switch (sort) {
      case 'popular':
        filteredVideos.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case 'oldest':
        filteredVideos.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
        break;
      case 'latest':
      default:
        filteredVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        break;
    }
    
    // Paginate results
    const paginatedVideos = filteredVideos.slice(skip, skip + limit);
    
    // Format videos for response
    const formattedVideos = paginatedVideos.map(video => ({
      ...video,
      formattedViewCount: formatViewCount(video.viewCount),
      formattedLikeCount: formatViewCount(video.likeCount),
      relativeTime: formatRelativeTime(video.publishedAt),
      formattedDate: new Date(video.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }));
    
    const total = filteredVideos.length;
    
    res.json({
      success: true,
      data: {
        videos: formattedVideos,
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
 * @route   GET /api/youtube/latest
 * @desc    Get latest YouTube videos
 * @access  Public
 */
router.get('/latest', [
  query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10')
], handleValidationErrors, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Get latest videos
    const latestVideos = [...sampleVideos]
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, limit);
    
    // Format videos for response
    const formattedVideos = latestVideos.map(video => ({
      ...video,
      formattedViewCount: formatViewCount(video.viewCount),
      formattedLikeCount: formatViewCount(video.likeCount),
      relativeTime: formatRelativeTime(video.publishedAt),
      formattedDate: new Date(video.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }));
    
    res.json({
      success: true,
      data: {
        videos: formattedVideos,
        count: formattedVideos.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching latest videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest videos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/youtube/popular
 * @desc    Get most popular YouTube videos
 * @access  Public
 */
router.get('/popular', [
  query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10')
], handleValidationErrors, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Get popular videos (sorted by view count)
    const popularVideos = [...sampleVideos]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);
    
    // Format videos for response
    const formattedVideos = popularVideos.map(video => ({
      ...video,
      formattedViewCount: formatViewCount(video.viewCount),
      formattedLikeCount: formatViewCount(video.likeCount),
      relativeTime: formatRelativeTime(video.publishedAt),
      formattedDate: new Date(video.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }));
    
    res.json({
      success: true,
      data: {
        videos: formattedVideos,
        count: formattedVideos.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching popular videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular videos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/youtube/stats
 * @desc    Get YouTube channel statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    // Calculate stats from sample data
    const totalVideos = sampleVideos.length;
    const totalViews = sampleVideos.reduce((sum, video) => sum + video.viewCount, 0);
    const totalLikes = sampleVideos.reduce((sum, video) => sum + video.likeCount, 0);
    
    // Category breakdown
    const categoryStats = sampleVideos.reduce((stats, video) => {
      stats[video.category] = (stats[video.category] || 0) + 1;
      return stats;
    }, {});
    
    // Most popular tags
    const tagStats = sampleVideos
      .flatMap(video => video.tags)
      .reduce((stats, tag) => {
        stats[tag] = (stats[tag] || 0) + 1;
        return stats;
      }, {});
    
    const topTags = Object.entries(tagStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
    
    res.json({
      success: true,
      data: {
        overview: {
          totalVideos,
          totalViews: formatViewCount(totalViews),
          totalLikes: formatViewCount(totalLikes),
          averageViewsPerVideo: Math.round(totalViews / totalVideos)
        },
        categories: Object.entries(categoryStats).map(([category, count]) => ({
          category,
          count,
          percentage: ((count / totalVideos) * 100).toFixed(1)
        })),
        topTags,
        recentActivity: {
          videosThisMonth: sampleVideos.filter(video => {
            const videoDate = new Date(video.publishedAt);
            const now = new Date();
            const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return videoDate >= oneMonthAgo;
          }).length
        }
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