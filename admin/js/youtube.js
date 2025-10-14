/**
 * YouTube Management Module
 * Handles YouTube video management with auto-fetch functionality
 */

class YouTubeManager {
    constructor() {
        this.videos = [];
        this.currentVideo = null;
        this.searchTerm = '';
        this.isLoading = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.createYouTubeModal();
    }

    bindEvents() {
        // Add video button
        const addBtn = document.getElementById('addYouTubeBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showYouTubeModal());
        }

        // Search
        const searchInput = document.getElementById('youtubeSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterVideos();
            });
        }
    }

    async loadVideos() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoading(true);

            console.log('YouTubeManager: Fetching videos with limit 50');
            const response = await window.api.getYouTubeVideos({ limit: 50 });
            console.log('YouTubeManager: Full API response:', response);
            
            // Handle different possible response structures
            let videos = [];
            if (response.data?.videos) {
                videos = response.data.videos;
            } else if (response.videos) {
                videos = response.videos;
            } else if (Array.isArray(response.data)) {
                videos = response.data;
            } else if (Array.isArray(response)) {
                videos = response;
            }
            
            console.log('YouTubeManager: Parsed videos array:', videos);
            this.videos = videos;
            
            this.renderVideos();
        } catch (error) {
            console.error('YouTubeManager: Error loading YouTube videos:', error);
            window.api.handleError(error, 'loading YouTube videos');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    renderVideos() {
        const container = document.getElementById('youtubeList');
        if (!container) return;

        if (this.videos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fab fa-youtube fa-3x"></i>
                    <h3>No YouTube Videos Found</h3>
                    <p>Add your YouTube videos to showcase your content.</p>
                    <button class="btn btn-primary" onclick="youtubeManager.showYouTubeModal()">
                        <i class="fas fa-plus"></i> Add First Video
                    </button>
                </div>
            `;
            return;
        }

        const filteredVideos = this.getFilteredVideos();
        
        container.innerHTML = filteredVideos.map(video => `
            <div class="content-item youtube-item" data-video-id="${video._id}">
                <div class="youtube-thumbnail">
                    <img src="${video.thumbnail || video.thumbnailMedium || '/admin/assets/placeholder.jpg'}" 
                         alt="${video.title}" loading="lazy">
                    <div class="play-overlay">
                        <i class="fab fa-youtube"></i>
                    </div>
                </div>
                <div class="item-info">
                    <div class="item-title">
                        ${video.title}
                        ${video.featured ? '<span class="badge badge-primary">Featured</span>' : ''}
                    </div>
                    <div class="item-description">${video.description || 'No description available'}</div>
                    <div class="item-meta">
                        <span><i class="fab fa-youtube"></i> ${video.author || 'Unknown'}</span>
                        <span><i class="fas fa-eye"></i> ${video.metrics?.views || 0} views</span>
                        <span><i class="fas fa-calendar"></i> ${window.adminDashboard.formatDate(video.createdAt)}</span>
                    </div>
                    <div class="video-actions-info">
                        <a href="${video.url}" target="_blank" class="video-link">
                            <i class="fas fa-external-link-alt"></i> Watch on YouTube
                        </a>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline" onclick="youtubeManager.watchVideo('${video.url}')">
                        <i class="fab fa-youtube"></i> Watch
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="youtubeManager.editVideo('${video._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="youtubeManager.deleteVideo('${video._id}', '${video.title}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    getFilteredVideos() {
        return this.videos.filter(video => {
            const matchesSearch = !this.searchTerm || 
                video.title.toLowerCase().includes(this.searchTerm) ||
                (video.description && video.description.toLowerCase().includes(this.searchTerm)) ||
                (video.author && video.author.toLowerCase().includes(this.searchTerm));
            
            return matchesSearch;
        });
    }

    filterVideos() {
        this.renderVideos();
    }

    showYouTubeModal(video = null) {
        this.currentVideo = video;
        const modalId = 'youtubeModal';
        
        // Create or update modal
        this.updateYouTubeModal(video);
        
        // Show modal
        window.showModal(modalId);
    }

    createYouTubeModal() {
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) return;

        const modalHTML = `
            <div id="youtubeModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="youtubeModalTitle">Add YouTube Video</h3>
                        <button class="modal-close" onclick="window.hideModal('youtubeModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="youtubeForm">
                            <div class="form-group">
                                <label for="youtubeUrl" class="required">YouTube Video URL</label>
                                <input type="url" id="youtubeUrl" class="form-input" required 
                                    placeholder="https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID">
                                <div class="field-help">Paste any YouTube video URL - we'll automatically fetch the details</div>
                                <div class="field-error" id="youtubeUrlError"></div>
                            </div>
                            
                            <div class="form-actions" style="border: none; margin: 1rem 0; padding: 0;">
                                <button type="button" class="btn btn-outline" id="fetchVideoBtn">
                                    <i class="fas fa-download"></i> Fetch Video Details
                                </button>
                            </div>
                            
                            <!-- Video Preview (initially hidden) -->
                            <div class="youtube-preview" id="videoPreview">
                                <div class="youtube-preview-content">
                                    <div class="youtube-thumbnail">
                                        <img id="previewThumbnail" src="" alt="Video thumbnail">
                                    </div>
                                    <div class="youtube-info">
                                        <div class="youtube-title" id="previewTitle"></div>
                                        <div class="youtube-meta" id="previewMeta"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="videoTitle" class="required">Video Title</label>
                                <input type="text" id="videoTitle" class="form-input" required maxlength="200">
                                <div class="field-help">Auto-populated from YouTube, but you can edit it</div>
                                <div class="field-error" id="videoTitleError"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="videoDescription">Description</label>
                                <textarea id="videoDescription" class="form-textarea" maxlength="1000" 
                                    placeholder="Optional description or notes about this video"></textarea>
                                <div class="field-help">Add your own description or context for this video</div>
                            </div>
                            
                            <div class="form-grid form-grid-2">
                                <div class="form-group">
                                    <label for="videoCategory">Category</label>
                                    <select id="videoCategory" class="form-select">
                                        <option value="">Select Category</option>
                                        <option value="tutorial">Tutorial</option>
                                        <option value="demo">Demo/Showcase</option>
                                        <option value="presentation">Presentation</option>
                                        <option value="interview">Interview</option>
                                        <option value="review">Review</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <div class="field-help">Organize your videos by category</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="videoFeatured">
                                        <input type="checkbox" id="videoFeatured"> Featured Video
                                    </label>
                                    <div class="field-help">Featured videos appear prominently on your site</div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="videoTags">Tags</label>
                                <div class="tag-input-wrapper" id="videoTagsWrapper">
                                    <input type="text" class="tag-input" id="videoTagInput" 
                                        placeholder="Type tag and press Enter">
                                </div>
                                <div class="field-help">Add relevant tags to help organize and find your videos</div>
                            </div>
                            
                            <!-- Hidden fields for auto-populated data -->
                            <input type="hidden" id="videoId">
                            <input type="hidden" id="videoThumbnail">
                            <input type="hidden" id="videoThumbnailMedium">
                            <input type="hidden" id="videoEmbedUrl">
                            <input type="hidden" id="videoAuthor">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="window.hideModal('youtubeModal')">
                            Cancel
                        </button>
                        <button type="submit" form="youtubeForm" class="btn btn-primary" id="youtubeSubmitBtn">
                            <i class="fas fa-save"></i> Save Video
                        </button>
                    </div>
                </div>
            </div>
        `;

        modalContainer.insertAdjacentHTML('beforeend', modalHTML);
        this.bindYouTubeFormEvents();
    }

    updateYouTubeModal(video) {
        const title = document.getElementById('youtubeModalTitle');
        const submitBtn = document.getElementById('youtubeSubmitBtn');
        
        if (video) {
            title.textContent = 'Edit YouTube Video';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Video';
            this.populateYouTubeForm(video);
        } else {
            title.textContent = 'Add YouTube Video';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Video';
            this.resetYouTubeForm();
        }
    }

    bindYouTubeFormEvents() {
        const form = document.getElementById('youtubeForm');
        const urlInput = document.getElementById('youtubeUrl');
        const fetchBtn = document.getElementById('fetchVideoBtn');
        const tagInput = document.getElementById('videoTagInput');

        // Form submission
        form.addEventListener('submit', (e) => this.handleYouTubeSubmit(e));

        // URL input changes
        urlInput.addEventListener('input', () => {
            this.hideVideoPreview();
            fetchBtn.disabled = !this.isValidYouTubeUrl(urlInput.value);
        });

        // Fetch video details
        fetchBtn.addEventListener('click', () => this.fetchVideoDetails());

        // Auto-fetch on URL paste/enter
        urlInput.addEventListener('paste', () => {
            setTimeout(() => {
                if (this.isValidYouTubeUrl(urlInput.value)) {
                    this.fetchVideoDetails();
                }
            }, 100);
        });

        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.isValidYouTubeUrl(urlInput.value)) {
                    this.fetchVideoDetails();
                }
            }
        });

        // Tags functionality
        this.setupTagInput(tagInput);

        // Auto-save removed for simplicity
    }

    setupTagInput(input) {
        const wrapper = document.getElementById('videoTagsWrapper');
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
        const wrapper = document.getElementById('videoTagsWrapper');
        const input = document.getElementById('videoTagInput');
        
        // Remove existing tags
        const existingTags = wrapper.querySelectorAll('.tag');
        existingTags.forEach(tag => tag.remove());

        // Add tags before input
        this.tags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                ${tag}
                <button type="button" class="tag-remove" onclick="youtubeManager.removeTag('${tag}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            wrapper.insertBefore(tagElement, input);
        });
    }

    isValidYouTubeUrl(url) {
        if (!url) return false;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];
        return patterns.some(pattern => pattern.test(url));
    }

    async fetchVideoDetails() {
        const urlInput = document.getElementById('youtubeUrl');
        const fetchBtn = document.getElementById('fetchVideoBtn');
        const originalText = fetchBtn.innerHTML;
        
        if (!this.isValidYouTubeUrl(urlInput.value)) {
            window.auth.showToast('Please enter a valid YouTube URL', 'error');
            return;
        }

        try {
            fetchBtn.disabled = true;
            fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';
            
            const result = await window.api.fetchYouTubeVideoData(urlInput.value);
            
            if (result.success) {
                this.populateVideoDetails(result.data);
                this.showVideoPreview(result.data);
                window.auth.showToast('Video details fetched successfully!', 'success');
            } else {
                window.auth.showToast(`Failed to fetch video details: ${result.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Error fetching video details:', error);
            window.auth.showToast('Failed to fetch video details', 'error');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = originalText;
        }
    }

    populateVideoDetails(videoData) {
        document.getElementById('videoId').value = videoData.videoId;
        document.getElementById('videoTitle').value = videoData.title;
        document.getElementById('videoThumbnail').value = videoData.thumbnail;
        document.getElementById('videoThumbnailMedium').value = videoData.thumbnailMedium;
        document.getElementById('videoEmbedUrl').value = videoData.embedUrl;
        document.getElementById('videoAuthor').value = videoData.author;
    }

    showVideoPreview(videoData) {
        const preview = document.getElementById('videoPreview');
        const thumbnail = document.getElementById('previewThumbnail');
        const title = document.getElementById('previewTitle');
        const meta = document.getElementById('previewMeta');
        
        thumbnail.src = videoData.thumbnailMedium || videoData.thumbnail;
        thumbnail.alt = videoData.title;
        title.textContent = videoData.title;
        meta.innerHTML = `
            <span><i class="fab fa-youtube"></i> ${videoData.author}</span>
            <span><i class="fas fa-link"></i> Video ID: ${videoData.videoId}</span>
        `;
        
        preview.classList.add('show');
    }

    hideVideoPreview() {
        const preview = document.getElementById('videoPreview');
        preview.classList.remove('show');
    }

    async handleYouTubeSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('youtubeSubmitBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            if (!this.validateYouTubeForm()) {
                return;
            }
            
            const formData = this.collectYouTubeFormData();
            
            let response;
            if (this.currentVideo) {
                response = await window.api.updateYouTubeVideo(this.currentVideo._id, formData);
                window.auth.showToast('Video updated successfully!', 'success');
            } else {
                response = await window.api.createYouTubeVideo(formData);
                window.auth.showToast('Video added successfully!', 'success');
            }
            
            window.hideModal('youtubeModal');
            await this.loadVideos();
            
        } catch (error) {
            console.error('Error saving YouTube video:', error);
            window.api.handleError(error, 'saving video');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    validateYouTubeForm() {
        let isValid = true;
        const errors = {};

        const url = document.getElementById('youtubeUrl').value.trim();
        const title = document.getElementById('videoTitle').value.trim();

        if (!url) {
            errors.youtubeUrl = 'YouTube URL is required';
            isValid = false;
        } else if (!this.isValidYouTubeUrl(url)) {
            errors.youtubeUrl = 'Please enter a valid YouTube URL';
            isValid = false;
        }

        if (!title) {
            errors.videoTitle = 'Video title is required';
            isValid = false;
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

    collectYouTubeFormData() {
        return {
            url: document.getElementById('youtubeUrl').value.trim(),
            videoId: document.getElementById('videoId').value,
            title: document.getElementById('videoTitle').value.trim(),
            description: document.getElementById('videoDescription').value.trim(),
            category: document.getElementById('videoCategory').value,
            featured: document.getElementById('videoFeatured').checked,
            tags: this.tags,
            thumbnail: document.getElementById('videoThumbnail').value,
            thumbnailMedium: document.getElementById('videoThumbnailMedium').value,
            embedUrl: document.getElementById('videoEmbedUrl').value,
            author: document.getElementById('videoAuthor').value
        };
    }

    populateYouTubeForm(video) {
        document.getElementById('youtubeUrl').value = video.url || '';
        document.getElementById('videoId').value = video.videoId || '';
        document.getElementById('videoTitle').value = video.title || '';
        document.getElementById('videoDescription').value = video.description || '';
        document.getElementById('videoCategory').value = video.category || '';
        document.getElementById('videoFeatured').checked = video.featured || false;
        document.getElementById('videoThumbnail').value = video.thumbnail || '';
        document.getElementById('videoThumbnailMedium').value = video.thumbnailMedium || '';
        document.getElementById('videoEmbedUrl').value = video.embedUrl || '';
        document.getElementById('videoAuthor').value = video.author || '';
        
        // Set tags
        this.tags = video.tags || [];
        this.renderTags();
        
        // Show preview if we have data
        if (video.videoId && video.title) {
            this.showVideoPreview({
                videoId: video.videoId,
                title: video.title,
                author: video.author,
                thumbnail: video.thumbnail,
                thumbnailMedium: video.thumbnailMedium
            });
        }
    }

    resetYouTubeForm() {
        document.getElementById('youtubeForm').reset();
        this.tags = [];
        this.renderTags();
        this.hideVideoPreview();
        this.displayFormErrors({});
    }

    async editVideo(id) {
        try {
            const response = await window.api.getYouTubeVideo(id);
            const video = response.data?.video;
            
            if (video) {
                this.showYouTubeModal(video);
            } else {
                window.auth.showToast('Video not found', 'error');
            }
        } catch (error) {
            console.error('Error loading video for edit:', error);
            window.api.handleError(error, 'loading video');
        }
    }

    async deleteVideo(id, title) {
        if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await window.api.deleteYouTubeVideo(id);
            window.auth.showToast('Video deleted successfully', 'success');
            await this.loadVideos();
        } catch (error) {
            console.error('Error deleting video:', error);
            window.api.handleError(error, 'deleting video');
        }
    }

    watchVideo(url) {
        window.open(url, '_blank');
    }

    showLoading(show) {
        const container = document.getElementById('youtubeList');
        if (!container) return;

        if (show) {
            container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading YouTube videos...</div>';
        } else {
            // Clear loading - renderVideos() will set the real content
            container.innerHTML = '';
        }
    }
}

// Add YouTube-specific styles
const youtubeStyles = document.createElement('style');
youtubeStyles.textContent = `
    .youtube-item {
        align-items: flex-start;
    }
    
    .youtube-thumbnail {
        width: 160px;
        height: 90px;
        border-radius: var(--border-radius);
        overflow: hidden;
        flex-shrink: 0;
        position: relative;
        margin-right: 1rem;
    }
    
    .youtube-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .play-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        opacity: 0.8;
        transition: opacity 0.3s ease;
    }
    
    .youtube-thumbnail:hover .play-overlay {
        opacity: 1;
    }
    
    .video-link {
        color: var(--primary-color);
        text-decoration: none;
        font-size: 0.875rem;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    
    .video-link:hover {
        text-decoration: underline;
    }
    
    .video-actions-info {
        margin-top: 0.5rem;
    }
    
    @media (max-width: 768px) {
        .youtube-item {
            flex-direction: column;
        }
        
        .youtube-thumbnail {
            width: 100%;
            height: 200px;
            margin-right: 0;
            margin-bottom: 1rem;
        }
    }
`;
document.head.appendChild(youtubeStyles);

// Initialize YouTube manager
const youtubeManager = new YouTubeManager();
window.youtubeManager = youtubeManager;