/**
 * Simplified YouTube Management
 * Load JSON data directly and provide simple CRUD operations
 */

// Simple YouTube management without complex classes
window.youtubeData = [];

// Load YouTube data from GitHub API
async function loadYouTubeData() {
    try {
        console.log('Loading YouTube videos from GitHub API...');
        const response = await window.api.getYouTubeVideos({ limit: 50 });
        window.youtubeData = response.data?.videos || [];
        console.log('Loaded YouTube videos:', window.youtubeData.length);
        displayYouTubeVideos();
        return true;
    } catch (error) {
        console.error('Error loading YouTube videos:', error);
        document.getElementById('youtubeList').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading YouTube videos: ${error.message}</p>
                <button onclick="loadYouTubeData()" class="btn btn-primary">Retry</button>
            </div>
        `;
        return false;
    }
}

// Display YouTube videos in a simple grid
function displayYouTubeVideos() {
    const container = document.getElementById('youtubeList');
    if (!container) return;

    if (window.youtubeData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fab fa-youtube fa-3x"></i>
                <h3>No YouTube Videos Found</h3>
                <p>Start by adding your first YouTube video to showcase your content.</p>
                <button onclick="showAddYouTubeForm()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add First Video
                </button>
            </div>
        `;
        return;
    }

    const videosHTML = window.youtubeData.map(video => `
        <div class="content-item video-item" data-video-id="${video._id}">
            <div class="video-thumbnail">
                <img src="${video.thumbnailMedium}" alt="${video.title}" onerror="this.src='https://via.placeholder.com/320x180/ccc/666?text=Video'">
                <div class="video-duration-overlay">
                    ${video.featured ? '<span class="badge badge-primary">Featured</span>' : ''}
                </div>
            </div>
            <div class="item-info">
                <div class="item-title">${video.title}</div>
                <div class="item-description">${video.description || 'No description'}</div>
                <div class="item-meta">
                    <span><i class="fas fa-tag"></i> ${video.category}</span>
                    <span><i class="fas fa-eye"></i> ${video.metrics?.views || 0} views</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(video.createdAt)}</span>
                </div>
                <div class="item-tags">
                    ${video.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-outline" onclick="viewYouTubeVideo('${video.url}')">
                    <i class="fas fa-external-link-alt"></i> Watch
                </button>
                <button class="btn btn-sm btn-primary" onclick="editYouTubeVideo('${video._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteYouTubeVideo('${video._id}', '${video.title}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = videosHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function viewYouTubeVideo(url) {
    window.open(url, '_blank');
}

// Extract YouTube video ID from URL
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

// CRUD operations
async function editYouTubeVideo(videoId) {
    const video = window.youtubeData.find(v => v._id === videoId);
    if (!video) {
        alert('YouTube video not found');
        return;
    }
    
    // Simple prompt-based editing
    const title = prompt('Video Title:', video.title);
    if (title === null) return;
    
    const description = prompt('Description:', video.description || '');
    if (description === null) return;
    
    const category = prompt('Category:', video.category);
    if (category === null) return;
    
    const tags = prompt('Tags (comma-separated):', video.tags?.join(', ') || '');
    if (tags === null) return;
    
    const featured = confirm('Is this a featured video?');
    
    const isActive = confirm('Is this video active/published?');
    
    // Prepare updated video data
    const updatedVideo = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        featured: featured,
        isActive: isActive
    };
    
    try {
        console.log('Updating YouTube video:', updatedVideo);
        const response = await window.api.updateYouTubeVideo(videoId, updatedVideo);
        if (response.success) {
            alert('YouTube video updated successfully!');
            await loadYouTubeData();
        }
    } catch (error) {
        console.error('Error updating YouTube video:', error);
        alert(`Error updating YouTube video: ${error.message}`);
    }
}

async function deleteYouTubeVideo(videoId, videoTitle) {
    if (!confirm(`Are you sure you want to delete "${videoTitle}"?`)) {
        return;
    }
    
    try {
        const response = await window.api.deleteYouTubeVideo(videoId);
        if (response.success) {
            alert('YouTube video deleted successfully!');
            await loadYouTubeData();
        }
    } catch (error) {
        console.error('Error deleting YouTube video:', error);
        alert(`Error deleting YouTube video: ${error.message}`);
    }
}

async function showAddYouTubeForm() {
    // Simple prompt-based video creation
    const url = prompt('YouTube Video URL:');
    if (!url) return;
    
    const videoId = extractVideoId(url);
    if (!videoId) {
        alert('Invalid YouTube URL. Please enter a valid YouTube video URL.');
        return;
    }
    
    const title = prompt('Video Title:');
    if (!title) return;
    
    const description = prompt('Description (optional):', '');
    if (description === null) return;
    
    const category = prompt('Category:', 'other');
    if (!category) return;
    
    const tags = prompt('Tags (comma-separated):', '');
    if (tags === null) return;
    
    const featured = confirm('Is this a featured video?');
    
    const isActive = confirm('Is this video active/published?');
    
    // Prepare new video data
    const newVideo = {
        videoId: videoId,
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        thumbnailMedium: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        author: 'Pranav Badgi',
        category: category.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        featured: featured,
        isActive: isActive
    };
    
    try {
        console.log('Creating new YouTube video:', newVideo);
        const response = await window.api.createYouTubeVideo(newVideo);
        if (response.success) {
            alert('YouTube video added successfully!');
            await loadYouTubeData();
        }
    } catch (error) {
        console.error('Error creating YouTube video:', error);
        alert(`Error creating YouTube video: ${error.message}`);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    const addBtn = document.getElementById('addYouTubeBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddYouTubeForm);
    }
});

// Export for admin panel to use
window.loadVideos = loadYouTubeData;
window.youtubeManager = {
    loadVideos: loadYouTubeData
};