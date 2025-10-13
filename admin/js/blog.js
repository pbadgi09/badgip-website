/**
 * Blog Management Module
 * Handles CRUD operations for blog posts
 */

class BlogManager {
    constructor() {
        this.posts = [];
        this.currentPost = null;
        this.searchTerm = '';
        this.statusFilter = '';
        this.isLoading = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.createBlogModal();
    }

    bindEvents() {
        // Add blog button
        const addBtn = document.getElementById('addBlogBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showBlogModal());
        }

        // Search and filter
        const searchInput = document.getElementById('blogSearch');
        const filterSelect = document.getElementById('blogFilter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterPosts();
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.filterPosts();
            });
        }
    }

    async loadBlogPosts() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoading(true);

            const response = await window.api.getBlogPosts({ limit: 50 });
            this.posts = response.data?.posts || [];
            
            this.renderPosts();
        } catch (error) {
            console.error('Error loading blog posts:', error);
            window.api.handleError(error, 'loading blog posts');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    renderPosts() {
        const container = document.getElementById('blogList');
        if (!container) return;

        if (this.posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-blog fa-3x"></i>
                    <h3>No Blog Posts Found</h3>
                    <p>Start sharing your thoughts and knowledge by creating your first blog post.</p>
                    <button class="btn btn-primary" onclick="blogManager.showBlogModal()">
                        <i class="fas fa-plus"></i> Write First Post
                    </button>
                </div>
            `;
            return;
        }

        const filteredPosts = this.getFilteredPosts();
        
        container.innerHTML = filteredPosts.map(post => `
            <div class="content-item" data-post-id="${post._id}">
                <div class="item-info">
                    <div class="item-title">
                        ${post.title}
                        ${post.featured ? '<span class="badge badge-primary">Featured</span>' : ''}
                        <span class="badge badge-${this.getStatusColor(post.status)}">${post.status}</span>
                    </div>
                    <div class="item-description">${post.excerpt || post.summary || 'No excerpt available'}</div>
                    <div class="item-meta">
                        <span><i class="fas fa-folder"></i> ${post.category || 'Uncategorized'}</span>
                        <span><i class="fas fa-eye"></i> ${post.metrics?.views || 0} views</span>
                        <span><i class="fas fa-heart"></i> ${post.metrics?.likes || 0} likes</span>
                        <span><i class="fas fa-calendar"></i> ${window.adminDashboard.formatDate(post.publishedAt || post.createdAt)}</span>
                    </div>
                    ${post.tags && post.tags.length > 0 ? `
                        <div class="item-tags">
                            ${post.tags.map(tag => `<span class="tag-item">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline" onclick="blogManager.viewPost('${post.seo?.slug || post._id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="blogManager.editPost('${post.seo?.slug || post._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="blogManager.deletePost('${post.seo?.slug || post._id}', '${post.title}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    getFilteredPosts() {
        return this.posts.filter(post => {
            const matchesSearch = !this.searchTerm || 
                post.title.toLowerCase().includes(this.searchTerm) ||
                (post.excerpt && post.excerpt.toLowerCase().includes(this.searchTerm)) ||
                (post.summary && post.summary.toLowerCase().includes(this.searchTerm)) ||
                (post.tags && post.tags.some(tag => tag.toLowerCase().includes(this.searchTerm)));
            
            const matchesStatus = !this.statusFilter || post.status === this.statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }

    filterPosts() {
        this.renderPosts();
    }

    showBlogModal(post = null) {
        this.currentPost = post;
        const modalId = 'blogModal';
        
        // Create or update modal
        this.updateBlogModal(post);
        
        // Show modal
        window.showModal(modalId);
    }

    createBlogModal() {
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) return;

        const modalHTML = `
            <div id="blogModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="blogModalTitle">Write New Post</h3>
                        <button class="modal-close" onclick="window.hideModal('blogModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="blogForm">
                            <div class="form-group">
                                <label for="blogTitle" class="required">Post Title</label>
                                <input type="text" id="blogTitle" class="form-input" required maxlength="200">
                                <div class="field-error" id="blogTitleError"></div>
                            </div>
                            
                            <div class="form-grid form-grid-2">
                                <div class="form-group">
                                    <label for="blogCategory" class="required">Category</label>
                                    <select id="blogCategory" class="form-select" required>
                                        <option value="">Select Category</option>
                                        <option value="web-development">Web Development</option>
                                        <option value="javascript">JavaScript</option>
                                        <option value="react">React</option>
                                        <option value="node-js">Node.js</option>
                                        <option value="tutorial">Tutorial</option>
                                        <option value="career">Career</option>
                                        <option value="technology">Technology</option>
                                        <option value="opinion">Opinion</option>
                                        <option value="review">Review</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <div class="field-error" id="blogCategoryError"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="blogStatus" class="required">Status</label>
                                    <select id="blogStatus" class="form-select" required>
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="blogExcerpt" class="required">Excerpt/Summary</label>
                                <textarea id="blogExcerpt" class="form-textarea" required maxlength="300" 
                                    placeholder="Brief summary of your blog post (max 300 characters)"></textarea>
                                <div class="field-help">This will be shown in post listings and previews</div>
                                <div class="field-error" id="blogExcerptError"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="blogContent" class="required">Content</label>
                                <textarea id="blogContent" class="form-textarea" required style="min-height: 300px;" 
                                    placeholder="Write your blog post content here. You can use Markdown formatting."></textarea>
                                <div class="field-help">
                                    You can use <strong>Markdown</strong> for formatting: 
                                    **bold**, *italic*, # Heading, [link](url), etc.
                                </div>
                                <div class="field-error" id="blogContentError"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="blogTags">Tags</label>
                                <div class="tag-input-wrapper" id="blogTagsWrapper">
                                    <input type="text" class="tag-input" id="blogTagInput" 
                                        placeholder="Type tag and press Enter">
                                </div>
                                <div class="field-help">Add relevant tags to help categorize your post</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="blogFeaturedImage">Featured Image</label>
                                <div class="file-input-wrapper">
                                    <input type="file" id="blogFeaturedImage" accept="image/*">
                                    <div class="file-input-display">
                                        <i class="fas fa-image"></i>
                                        <div>Upload featured image</div>
                                        <div class="field-help">Optional cover image for your blog post</div>
                                    </div>
                                </div>
                                <div class="image-preview" id="blogImagePreview"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="blogFeatured">
                                    <input type="checkbox" id="blogFeatured"> Featured Post
                                </label>
                                <div class="field-help">Featured posts appear prominently on your blog</div>
                            </div>
                            
                            <!-- SEO Fields -->
                            <details class="seo-section">
                                <summary>SEO Settings (Optional)</summary>
                                <div class="form-group">
                                    <label for="blogMetaDescription">Meta Description</label>
                                    <textarea id="blogMetaDescription" class="form-textarea" maxlength="160" 
                                        placeholder="SEO meta description (max 160 characters)"></textarea>
                                    <div class="field-help">This appears in search engine results</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="blogKeywords">SEO Keywords</label>
                                    <input type="text" id="blogKeywords" class="form-input" 
                                        placeholder="Comma-separated keywords">
                                    <div class="field-help">Keywords for search engine optimization</div>
                                </div>
                            </details>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="window.hideModal('blogModal')">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-outline" id="saveDraftBtn">
                            <i class="fas fa-save"></i> Save Draft
                        </button>
                        <button type="submit" form="blogForm" class="btn btn-primary" id="blogSubmitBtn">
                            <i class="fas fa-paper-plane"></i> Publish
                        </button>
                    </div>
                </div>
            </div>
        `;

        modalContainer.insertAdjacentHTML('beforeend', modalHTML);
        this.bindBlogFormEvents();
    }

    updateBlogModal(post) {
        const title = document.getElementById('blogModalTitle');
        const submitBtn = document.getElementById('blogSubmitBtn');
        
        if (post) {
            title.textContent = 'Edit Blog Post';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Post';
            this.populateBlogForm(post);
        } else {
            title.textContent = 'Write New Post';
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish';
            this.resetBlogForm();
        }
    }

    bindBlogFormEvents() {
        const form = document.getElementById('blogForm');
        const tagInput = document.getElementById('blogTagInput');
        const imageInput = document.getElementById('blogFeaturedImage');
        const saveDraftBtn = document.getElementById('saveDraftBtn');

        // Form submission
        form.addEventListener('submit', (e) => this.handleBlogSubmit(e, 'published'));

        // Save draft
        saveDraftBtn.addEventListener('click', () => this.handleBlogSubmit(null, 'draft'));

        // Tags functionality
        this.setupTagInput(tagInput);

        // Image upload
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Auto-save setup
        if (window.adminDashboard) {
            window.adminDashboard.setupAutoSave(form, (type) => {
                this.handleBlogSubmit(null, 'draft', true); // Silent auto-save
            });
        }

        // Live character count for excerpt
        const excerptInput = document.getElementById('blogExcerpt');
        excerptInput.addEventListener('input', () => {
            const count = excerptInput.value.length;
            const help = excerptInput.parentNode.querySelector('.field-help');
            help.innerHTML = `This will be shown in post listings and previews (${count}/300 characters)`;
        });

        // Live character count for meta description
        const metaInput = document.getElementById('blogMetaDescription');
        metaInput.addEventListener('input', () => {
            const count = metaInput.value.length;
            const help = metaInput.parentNode.querySelector('.field-help');
            help.innerHTML = `This appears in search engine results (${count}/160 characters)`;
        });
    }

    setupTagInput(input) {
        const wrapper = document.getElementById('blogTagsWrapper');
        this.tags = [];

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = input.value.trim();
                if (tag && !this.tags.includes(tag)) {
                    this.addTag(tag);
                    input.value = '';
                }
            }
        });

        input.addEventListener('blur', () => {
            const tag = input.value.trim();
            if (tag && !this.tags.includes(tag)) {
                this.addTag(tag);
                input.value = '';
            }
        });
    }

    addTag(tag) {
        this.tags.push(tag);
        this.renderTags();
    }

    removeTag(tag) {
        this.tags = this.tags.filter(t => t !== tag);
        this.renderTags();
    }

    renderTags() {
        const wrapper = document.getElementById('blogTagsWrapper');
        const input = document.getElementById('blogTagInput');
        
        // Remove existing tags
        const existingTags = wrapper.querySelectorAll('.tag');
        existingTags.forEach(tag => tag.remove());

        // Add tags before input
        this.tags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                ${tag}
                <button type="button" class="tag-remove" onclick="blogManager.removeTag('${tag}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            wrapper.insertBefore(tagElement, input);
        });
    }

    async handleImageUpload(e) {
        const files = Array.from(e.target.files);
        const preview = document.getElementById('blogImagePreview');
        
        preview.innerHTML = '';
        
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.alt = file.name;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'image-preview-remove';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.onclick = () => previewItem.remove();
                
                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                preview.appendChild(previewItem);
            }
        }
    }

    async handleBlogSubmit(e, status = 'published', silent = false) {
        if (e) e.preventDefault();
        
        const submitBtn = document.getElementById('blogSubmitBtn');
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        const activeBtn = status === 'draft' ? saveDraftBtn : submitBtn;
        const originalText = activeBtn.innerHTML;
        
        try {
            if (!silent) {
                activeBtn.disabled = true;
                activeBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${status === 'draft' ? 'Saving...' : 'Publishing...'}`;
            }
            
            if (!this.validateBlogForm(status)) {
                return;
            }
            
            const formData = this.collectBlogFormData();
            formData.status = status;
            
            // Check for duplicate slug if creating new post
            if (!this.currentPost) {
                const duplicateSlug = await this.checkAndFixDuplicateSlug(formData.seo.slug);
                formData.seo.slug = duplicateSlug;
            }
            
            // Add debug logging
            console.log('Blog form data being sent:', JSON.stringify(formData, null, 2));
            
            let response;
            if (this.currentPost) {
                response = await window.api.updateBlogPost(this.currentPost.seo?.slug || this.currentPost._id, formData);
                if (!silent) {
                    window.auth.showToast(`Post ${status === 'draft' ? 'saved as draft' : 'updated'} successfully!`, 'success');
                }
            } else {
                response = await window.api.createBlogPost(formData);
                if (!silent) {
                    window.auth.showToast(`Post ${status === 'draft' ? 'saved as draft' : 'published'} successfully!`, 'success');
                }
            }
            
            console.log('Blog API response:', response);
            
            if (!silent) {
                window.hideModal('blogModal');
                await this.loadBlogPosts();
            }
            
        } catch (error) {
            console.error('Detailed error saving blog post:', {
                error: error,
                message: error.message,
                stack: error.stack,
                formData: this.collectBlogFormData()
            });
            if (!silent) {
                // Show more specific error message
                let errorMessage = 'Failed to save blog post';
                if (error.message.includes('already exists')) {
                    errorMessage = 'A post with this title already exists. Please use a different title.';
                } else if (error.message.includes('validation')) {
                    errorMessage = 'Please check all required fields and try again.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                window.auth.showToast(errorMessage, 'error');
            }
        } finally {
            if (!silent) {
                activeBtn.disabled = false;
                activeBtn.innerHTML = originalText;
            }
        }
    }

    validateBlogForm(status) {
        let isValid = true;
        const errors = {};

        const title = document.getElementById('blogTitle').value.trim();
        const category = document.getElementById('blogCategory').value;
        const excerpt = document.getElementById('blogExcerpt').value.trim();
        const content = document.getElementById('blogContent').value.trim();

        if (!title) {
            errors.blogTitle = 'Post title is required';
            isValid = false;
        }

        if (!category) {
            errors.blogCategory = 'Category is required';
            isValid = false;
        }

        if (!excerpt) {
            errors.blogExcerpt = 'Excerpt is required';
            isValid = false;
        } else if (excerpt.length > 300) {
            errors.blogExcerpt = 'Excerpt must be less than 300 characters';
            isValid = false;
        }

        if (!content) {
            errors.blogContent = 'Content is required';
            isValid = false;
        }

        // Only require complete validation for published posts
        if (status === 'published') {
            if (content.length < 100) {
                errors.blogContent = 'Published posts should have at least 100 characters of content';
                isValid = false;
            }
        }

        this.displayFormErrors(errors);
        return isValid;
    }

    displayFormErrors(errors) {
        // Clear existing errors
        document.querySelectorAll('.field-error').forEach(el => {
            el.textContent = '';
            el.previousElementSibling.classList.remove('error');
        });

        // Display new errors
        Object.entries(errors).forEach(([field, message]) => {
            const errorEl = document.getElementById(`${field}Error`);
            const inputEl = document.getElementById(field);
            
            if (errorEl && inputEl) {
                errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
                inputEl.classList.add('error');
            }
        });
    }

    collectBlogFormData() {
        const keywords = document.getElementById('blogKeywords').value
            .split(',')
            .map(k => k.trim())
            .filter(k => k);

        const title = document.getElementById('blogTitle').value.trim();
        const slug = this.generateSlug(title);

        return {
            title: title,
            category: document.getElementById('blogCategory').value,
            excerpt: document.getElementById('blogExcerpt').value.trim(),
            content: document.getElementById('blogContent').value.trim(),
            tags: this.tags,
            featured: document.getElementById('blogFeatured').checked,
            featuredImage: {
                url: 'https://via.placeholder.com/800x400/6366f1/ffffff?text=Blog+Post+Image',
                alt: title + ' - Featured Image'
            },
            seo: {
                slug: slug,
                metaDescription: document.getElementById('blogMetaDescription').value.trim(),
                keywords: keywords
            }
        };
    }

    generateSlug(title) {
        if (!title || typeof title !== 'string') {
            return 'untitled-post-' + Date.now();
        }
        
        let slug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
            
        // Fallback if slug is empty after processing
        if (!slug || slug.length < 3) {
            slug = 'blog-post-' + Date.now();
        }
        
        return slug;
    }

    async checkAndFixDuplicateSlug(originalSlug) {
        try {
            let testSlug = originalSlug;
            let counter = 1;
            
            // Check if slug already exists
            while (true) {
                try {
                    await window.api.getBlogPost(testSlug);
                    // If we get here, slug exists, try next variation
                    testSlug = `${originalSlug}-${counter}`;
                    counter++;
                } catch (error) {
                    // If we get 404, slug is available
                    if (error.message.includes('404') || error.message.includes('not found')) {
                        return testSlug;
                    }
                    // For other errors, use original slug and let backend handle it
                    return originalSlug;
                }
                
                // Safety limit to prevent infinite loop
                if (counter > 100) {
                    return originalSlug + '-' + Date.now();
                }
            }
        } catch (error) {
            console.log('Error checking duplicate slug, using original:', error);
            return originalSlug;
        }
    }

    populateBlogForm(post) {
        document.getElementById('blogTitle').value = post.title || '';
        document.getElementById('blogCategory').value = post.category || '';
        document.getElementById('blogExcerpt').value = post.excerpt || post.summary || '';
        document.getElementById('blogContent').value = post.content || '';
        document.getElementById('blogStatus').value = post.status || 'draft';
        document.getElementById('blogFeatured').checked = post.featured || false;
        document.getElementById('blogMetaDescription').value = post.seo?.metaDescription || '';
        document.getElementById('blogKeywords').value = post.seo?.keywords?.join(', ') || '';
        
        // Set tags
        this.tags = post.tags || [];
        this.renderTags();
    }

    resetBlogForm() {
        document.getElementById('blogForm').reset();
        this.tags = [];
        this.renderTags();
        document.getElementById('blogImagePreview').innerHTML = '';
        this.displayFormErrors({});
    }

    async editPost(slug) {
        try {
            const response = await window.api.getBlogPost(slug);
            const post = response.data?.post;
            
            if (post) {
                this.showBlogModal(post);
            } else {
                window.auth.showToast('Blog post not found', 'error');
            }
        } catch (error) {
            console.error('Error loading post for edit:', error);
            window.api.handleError(error, 'loading blog post');
        }
    }

    async deletePost(slug, title) {
        if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await window.api.deleteBlogPost(slug);
            window.auth.showToast('Blog post deleted successfully', 'success');
            await this.loadBlogPosts();
        } catch (error) {
            console.error('Error deleting blog post:', error);
            window.api.handleError(error, 'deleting blog post');
        }
    }

    viewPost(slug) {
        const postUrl = `https://itspranavbadgi.com/blog/${slug}`;
        window.open(postUrl, '_blank');
    }

    showLoading(show) {
        const container = document.getElementById('blogList');
        if (!container) return;

        if (show) {
            container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading blog posts...</div>';
        }
    }

    getStatusColor(status) {
        const colors = {
            'published': 'success',
            'draft': 'warning'
        };
        return colors[status] || 'secondary';
    }
}

// Add blog-specific styles
const blogStyles = document.createElement('style');
blogStyles.textContent = `
    .item-tags {
        margin-top: 0.5rem;
    }
    
    .tag-item {
        display: inline-block;
        background: var(--gray-100);
        color: var(--gray-700);
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        margin-right: 0.5rem;
        margin-bottom: 0.25rem;
    }
    
    .seo-section {
        border: 1px solid var(--gray-200);
        border-radius: var(--border-radius);
        padding: 1rem;
        margin-top: 1rem;
    }
    
    .seo-section summary {
        cursor: pointer;
        font-weight: 500;
        color: var(--gray-700);
        margin-bottom: 1rem;
    }
    
    .seo-section[open] summary {
        margin-bottom: 1rem;
    }
`;
document.head.appendChild(blogStyles);

// Initialize blog manager
const blogManager = new BlogManager();
window.blogManager = blogManager;