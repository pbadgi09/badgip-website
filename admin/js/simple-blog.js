/**
 * Simplified Blog Management
 * Load JSON data directly and provide simple CRUD operations
 */

// Simple blog management without complex classes
window.blogData = [];

// Load blog data from GitHub API
async function loadBlogData() {
    try {
        console.log('Loading blog posts from GitHub API...');
        const response = await window.api.getBlogPosts({ limit: 50 });
        window.blogData = response.data?.posts || [];
        console.log('Loaded blog posts:', window.blogData.length);
        displayBlogPosts();
        return true;
    } catch (error) {
        console.error('Error loading blog posts:', error);
        document.getElementById('blogList').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading blog posts: ${error.message}</p>
                <button onclick="loadBlogData()" class="btn btn-primary">Retry</button>
            </div>
        `;
        return false;
    }
}

// Display blog posts in a simple table
function displayBlogPosts() {
    const container = document.getElementById('blogList');
    if (!container) return;

    if (window.blogData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-blog fa-3x"></i>
                <h3>No Blog Posts Found</h3>
                <p>Start by creating your first blog post to share your thoughts.</p>
                <button onclick="showAddBlogForm()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Write First Post
                </button>
            </div>
        `;
        return;
    }

    const blogHTML = window.blogData.map(post => `
        <div class="content-item" data-post-id="${post._id}">
            <div class="item-info">
                <div class="item-title">
                    ${post.title}
                    ${post.featured ? '<span class="badge badge-primary">Featured</span>' : ''}
                    <span class="badge badge-${getStatusColor(post.status)}">${post.status}</span>
                </div>
                <div class="item-description">${post.excerpt}</div>
                <div class="item-meta">
                    <span><i class="fas fa-tag"></i> ${post.category}</span>
                    <span><i class="fas fa-eye"></i> ${post.metrics?.views || 0} views</span>
                    <span><i class="fas fa-clock"></i> ${post.readTime || 5} min read</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(post.publishedAt || post.createdAt)}</span>
                </div>
                <div class="item-tags">
                    ${post.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-outline" onclick="viewBlogPost('${post.seo?.slug || post._id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm btn-primary" onclick="editBlogPost('${post._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteBlogPost('${post._id}', '${post.title}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = blogHTML;
}

// Utility functions
function getStatusColor(status) {
    const colors = {
        'published': 'success',
        'draft': 'warning',
        'archived': 'secondary'
    };
    return colors[status] || 'secondary';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function viewBlogPost(slug) {
    const postUrl = `https://itspranavbadgi.com/blog/${slug}`;
    window.open(postUrl, '_blank');
}

// CRUD operations
async function editBlogPost(postId) {
    const post = window.blogData.find(p => p._id === postId);
    if (!post) {
        alert('Blog post not found');
        return;
    }
    
    // Simple prompt-based editing
    const title = prompt('Post Title:', post.title);
    if (title === null) return;
    
    const excerpt = prompt('Short Excerpt:', post.excerpt);
    if (excerpt === null) return;
    
    const content = prompt('Content (full post):', post.content || '');
    if (content === null) return;
    
    const category = prompt('Category:', post.category);
    if (category === null) return;
    
    const tags = prompt('Tags (comma-separated):', post.tags?.join(', ') || '');
    if (tags === null) return;
    
    const status = prompt('Status (published/draft):', post.status);
    if (status === null) return;
    
    const featured = confirm('Is this a featured post?');
    
    const readTime = prompt('Read time (minutes):', post.readTime || '5');
    if (readTime === null) return;
    
    const metaDescription = prompt('SEO Meta Description (optional):', post.seo?.metaDescription || '');
    if (metaDescription === null) return;
    
    // Prepare updated post data
    const updatedPost = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        category: category.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        status: status.trim(),
        featured: featured,
        readTime: parseInt(readTime) || 5,
        seo: {
            slug: post.seo?.slug || generateSlug(title),
            metaDescription: metaDescription.trim(),
            keywords: post.seo?.keywords || []
        },
        author: {
            name: post.author?.name || 'Pranav Badgi',
            email: post.author?.email || 'hello@pranavbadgi.com'
        }
    };
    
    try {
        console.log('Updating blog post:', updatedPost);
        const response = await window.api.updateBlogPost(postId, updatedPost);
        if (response.success) {
            alert('Blog post updated successfully!');
            await loadBlogData();
        }
    } catch (error) {
        console.error('Error updating blog post:', error);
        alert(`Error updating blog post: ${error.message}`);
    }
}

async function deleteBlogPost(postId, postTitle) {
    if (!confirm(`Are you sure you want to delete "${postTitle}"?`)) {
        return;
    }
    
    try {
        const response = await window.api.deleteBlogPost(postId);
        if (response.success) {
            alert('Blog post deleted successfully!');
            await loadBlogData();
        }
    } catch (error) {
        console.error('Error deleting blog post:', error);
        alert(`Error deleting blog post: ${error.message}`);
    }
}

async function showAddBlogForm() {
    // Simple prompt-based blog creation
    const title = prompt('Post Title:');
    if (!title) return;
    
    const excerpt = prompt('Short Excerpt:');
    if (!excerpt) return;
    
    const content = prompt('Content (full post):');
    if (!content) return;
    
    const category = prompt('Category:', 'technology');
    if (!category) return;
    
    const tags = prompt('Tags (comma-separated):', '');
    if (tags === null) return;
    
    const status = prompt('Status (published/draft):', 'draft');
    if (!status) return;
    
    const featured = confirm('Is this a featured post?');
    
    const readTime = prompt('Read time (minutes):', '5');
    if (!readTime) return;
    
    const metaDescription = prompt('SEO Meta Description (optional):', '');
    if (metaDescription === null) return;
    
    // Prepare new post data
    const newPost = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        category: category.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        status: status.trim(),
        featured: featured,
        readTime: parseInt(readTime) || 5,
        seo: {
            slug: generateSlug(title),
            metaDescription: metaDescription.trim(),
            keywords: []
        },
        author: {
            name: 'Pranav Badgi',
            email: 'hello@pranavbadgi.com'
        },
        featuredImage: {
            url: '',
            alt: `${title} - Featured Image`
        }
    };
    
    try {
        console.log('Creating new blog post:', newPost);
        const response = await window.api.createBlogPost(newPost);
        if (response.success) {
            alert('Blog post created successfully!');
            await loadBlogData();
        }
    } catch (error) {
        console.error('Error creating blog post:', error);
        alert(`Error creating blog post: ${error.message}`);
    }
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    const addBtn = document.getElementById('addBlogBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddBlogForm);
    }
});

// Export for admin panel to use
window.loadBlogPosts = loadBlogData;
window.blogManager = {
    loadBlogPosts: loadBlogData
};