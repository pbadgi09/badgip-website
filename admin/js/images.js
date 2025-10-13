/**
 * Image Management Module
 * Handles image uploads, library management, and associations
 */

class ImageManager {
    constructor() {
        this.images = [];
        this.selectedImages = new Set();
        this.currentFilter = { category: '', tags: [], search: '' };
        this.currentPage = 1;
        this.imagesPerPage = 12;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.createImageModal();
        this.createImageLibraryModal();
    }

    bindEvents() {
        // Add image upload button
        const uploadBtn = document.getElementById('addImageBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.showUploadModal());
        }

        // Image library button
        const libraryBtn = document.getElementById('imageLibraryBtn');
        if (libraryBtn) {
            libraryBtn.addEventListener('click', () => this.showImageLibrary());
        }
    }

    async loadImages() {
        try {
            // Load image statistics for the images tab overview
            const response = await window.api.getImageStats();
            
            if (response.success) {
                this.updateImageStats(response.data);
            }
            
            // Load recent images
            await this.loadRecentImages();
            
        } catch (error) {
            console.error('Error loading images overview:', error);
            window.api.handleError(error, 'loading images');
        }
    }

    async loadRecentImages() {
        try {
            const response = await window.api.getImages({ limit: 6, sortBy: 'createdAt', sortOrder: 'desc' });
            
            if (response.success) {
                this.renderRecentImages(response.data.images);
            }
        } catch (error) {
            console.error('Error loading recent images:', error);
        }
    }

    updateImageStats(stats) {
        const elements = {
            totalImagesCount: document.getElementById('totalImagesCount'),
            blogImagesCount: document.getElementById('blogImagesCount'),
            projectImagesCount: document.getElementById('projectImagesCount'),
            storageUsedMB: document.getElementById('storageUsedMB')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                const value = stats[key] || 0;
                element.textContent = value;
            }
        });

        // Update category stats if available
        if (stats.categories) {
            this.renderCategoryStats(stats.categories);
        }
    }

    renderRecentImages(images) {
        const container = document.getElementById('recentImagesGrid');
        if (!container) return;

        if (images.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images fa-2x"></i>
                    <p>No images uploaded yet</p>
                    <button class="btn btn-primary" onclick="imageManager.showUploadModal()">
                        <i class="fas fa-upload"></i> Upload First Image
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = images.map(image => `
            <div class="recent-image-item">
                <div class="recent-image-thumbnail">
                    <img src="${image.thumbnailUrl}" alt="${image.alt}" loading="lazy">
                </div>
                <div class="recent-image-info">
                    <div class="recent-image-title">${image.title}</div>
                    <div class="recent-image-meta">
                        <span class="recent-image-category">${image.seo?.category || 'general'}</span>
                        <span class="recent-image-date">${window.adminDashboard.formatDate(image.createdAt)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderCategoryStats(categories) {
        const container = document.getElementById('imageCategoryStats');
        if (!container) return;

        container.innerHTML = Object.entries(categories).map(([category, count]) => `
            <div class="category-stat-item">
                <span class="category-name">${category}</span>
                <span class="category-count">${count}</span>
            </div>
        `).join('');
    }

    createImageModal() {
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) return;

        const modalHTML = `
            <div id="imageUploadModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Upload Images</h3>
                        <button class="modal-close" onclick="window.hideModal('imageUploadModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="imageUploadForm" enctype="multipart/form-data">
                            <div class="form-group">
                                <label for="imageFiles" class="required">Select Images</label>
                                <div class="file-input-wrapper">
                                    <input type="file" id="imageFiles" accept="image/*" multiple>
                                    <div class="file-input-display">
                                        <i class="fas fa-images"></i>
                                        <div>Choose images to upload</div>
                                        <div class="field-help">Select up to 5 images (10MB max each)</div>
                                    </div>
                                </div>
                                <div class="field-error" id="imageFilesError"></div>
                            </div>

                            <div id="imagePreviewContainer" class="image-preview-grid"></div>

                            <div class="form-group">
                                <label for="imageCategory" class="required">Category</label>
                                <select id="imageCategory" class="form-select" required>
                                    <option value="">Select Category</option>
                                    <option value="blog">Blog</option>
                                    <option value="project">Project</option>
                                    <option value="ui">UI/Design</option>
                                    <option value="screenshot">Screenshot</option>
                                    <option value="photo">Photo</option>
                                    <option value="icon">Icon</option>
                                    <option value="general">General</option>
                                </select>
                                <div class="field-error" id="imageCategoryError"></div>
                            </div>

                            <div class="form-group">
                                <label for="imageTags">Tags</label>
                                <div class="tag-input-wrapper" id="imageTagsWrapper">
                                    <input type="text" class="tag-input" id="imageTagInput" 
                                        placeholder="Type tag and press Enter">
                                </div>
                                <div class="field-help">Add relevant tags to help organize and find images</div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="window.hideModal('imageUploadModal')">
                            Cancel
                        </button>
                        <button type="submit" form="imageUploadForm" class="btn btn-primary" id="imageUploadBtn">
                            <i class="fas fa-upload"></i> Upload Images
                        </button>
                    </div>
                </div>
            </div>
        `;

        modalContainer.insertAdjacentHTML('beforeend', modalHTML);
        this.bindUploadFormEvents();
    }

    createImageLibraryModal() {
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) return;

        const modalHTML = `
            <div id="imageLibraryModal" class="modal large-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Image Library</h3>
                        <button class="modal-close" onclick="window.hideModal('imageLibraryModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="image-library-header">
                            <div class="library-search">
                                <div class="search-filters">
                                    <input type="text" id="imageSearch" placeholder="Search images..." class="form-input">
                                    <select id="imageCategoryFilter" class="form-select">
                                        <option value="">All Categories</option>
                                        <option value="blog">Blog</option>
                                        <option value="project">Project</option>
                                        <option value="ui">UI/Design</option>
                                        <option value="screenshot">Screenshot</option>
                                        <option value="photo">Photo</option>
                                        <option value="icon">Icon</option>
                                        <option value="general">General</option>
                                    </select>
                                    <button type="button" class="btn btn-outline" id="clearImageFilters">
                                        <i class="fas fa-times"></i> Clear
                                    </button>
                                </div>
                            </div>
                            <div class="library-actions">
                                <span class="selection-count" id="imageSelectionCount">0 selected</span>
                                <button type="button" class="btn btn-outline" id="selectAllImages">Select All</button>
                                <button type="button" class="btn btn-outline" id="clearImageSelection">Clear Selection</button>
                            </div>
                        </div>
                        
                        <div id="imageLibraryGrid" class="image-library-grid">
                            <div class="loading-spinner">
                                <i class="fas fa-spinner fa-spin"></i> Loading images...
                            </div>
                        </div>
                        
                        <div class="image-library-pagination" id="imageLibraryPagination"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="window.hideModal('imageLibraryModal')">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-primary" id="selectImagesBtn">
                            <i class="fas fa-check"></i> Select Images
                        </button>
                    </div>
                </div>
            </div>
        `;

        modalContainer.insertAdjacentHTML('beforeend', modalHTML);
        this.bindLibraryEvents();
    }

    bindUploadFormEvents() {
        const form = document.getElementById('imageUploadForm');
        const fileInput = document.getElementById('imageFiles');
        const tagInput = document.getElementById('imageTagInput');

        // Handle file selection
        fileInput.addEventListener('change', (e) => this.handleFileSelection(e));

        // Form submission
        form.addEventListener('submit', (e) => this.handleUploadSubmit(e));

        // Tags functionality
        this.setupTagInput(tagInput, 'imageTagsWrapper');
    }

    bindLibraryEvents() {
        // Search and filters
        const searchInput = document.getElementById('imageSearch');
        const categoryFilter = document.getElementById('imageCategoryFilter');
        const clearFilters = document.getElementById('clearImageFilters');

        searchInput.addEventListener('input', debounce(() => this.applyFilters(), 500));
        categoryFilter.addEventListener('change', () => this.applyFilters());
        clearFilters.addEventListener('click', () => this.clearFilters());

        // Selection actions
        const selectAll = document.getElementById('selectAllImages');
        const clearSelection = document.getElementById('clearImageSelection');
        const selectBtn = document.getElementById('selectImagesBtn');

        selectAll.addEventListener('click', () => this.selectAllImages());
        clearSelection.addEventListener('click', () => this.clearSelection());
        selectBtn.addEventListener('click', () => this.confirmImageSelection());
    }

    async showUploadModal() {
        this.resetUploadForm();
        window.showModal('imageUploadModal');
    }

    async showImageLibrary() {
        window.showModal('imageLibraryModal');
        await this.loadImageLibrary();
    }

    resetUploadForm() {
        document.getElementById('imageUploadForm').reset();
        document.getElementById('imagePreviewContainer').innerHTML = '';
        this.uploadTags = [];
        this.renderTags('imageTagsWrapper', []);
        this.displayUploadFormErrors({});
    }

    async handleFileSelection(e) {
        const files = Array.from(e.target.files);
        const previewContainer = document.getElementById('imagePreviewContainer');
        
        previewContainer.innerHTML = '';
        
        if (files.length === 0) return;
        
        // Validate files
        const validFiles = [];
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                window.auth.showToast(`${file.name} is too large (max 10MB)`, 'error');
                continue;
            }
            
            if (!file.type.startsWith('image/')) {
                window.auth.showToast(`${file.name} is not a valid image`, 'error');
                continue;
            }
            
            validFiles.push(file);
        }
        
        if (validFiles.length > 5) {
            window.auth.showToast('Maximum 5 images can be uploaded at once', 'warning');
            validFiles.splice(5);
        }
        
        // Create previews
        for (const file of validFiles) {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = file.name;
            
            const info = document.createElement('div');
            info.className = 'image-preview-info';
            info.innerHTML = `
                <div class="image-preview-name">${file.name}</div>
                <div class="image-preview-size">${this.formatFileSize(file.size)}</div>
                <input type="text" class="form-input image-title-input" 
                    placeholder="Image title" value="${file.name.split('.')[0]}">
                <input type="text" class="form-input image-alt-input" 
                    placeholder="Alt text (for accessibility)" value="${file.name.split('.')[0]}">
            `;
            
            previewItem.appendChild(img);
            previewItem.appendChild(info);
            previewContainer.appendChild(previewItem);
        }
    }

    async handleUploadSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('imageUploadBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            
            if (!this.validateUploadForm()) {
                return;
            }
            
            const formData = new FormData();
            const fileInput = document.getElementById('imageFiles');
            const category = document.getElementById('imageCategory').value;
            const tags = this.uploadTags || [];
            
            // Add files
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('images', fileInput.files[i]);
            }
            
            // Add metadata
            formData.append('category', category);
            formData.append('tags', JSON.stringify(tags));
            
            // Add individual titles and alt texts
            const previewItems = document.querySelectorAll('.image-preview-item');
            previewItems.forEach((item, index) => {
                const title = item.querySelector('.image-title-input').value.trim();
                const alt = item.querySelector('.image-alt-input').value.trim();
                
                formData.append(`titles[${index}]`, title);
                formData.append(`alts[${index}]`, alt);
            });
            
            const response = await window.api.uploadImages(formData);
            
            if (response.success) {
                window.auth.showToast(`Successfully uploaded ${response.data.images.length} image(s)!`, 'success');
                window.hideModal('imageUploadModal');
                
                // Refresh image library if open
                if (document.getElementById('imageLibraryModal').style.display !== 'none') {
                    await this.loadImageLibrary();
                }
            } else {
                throw new Error(response.message || 'Upload failed');
            }
            
        } catch (error) {
            console.error('Error uploading images:', error);
            window.auth.showToast('Failed to upload images: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    validateUploadForm() {
        let isValid = true;
        const errors = {};
        
        const fileInput = document.getElementById('imageFiles');
        const category = document.getElementById('imageCategory').value;
        
        if (!fileInput.files || fileInput.files.length === 0) {
            errors.imageFiles = 'Please select at least one image';
            isValid = false;
        }
        
        if (!category) {
            errors.imageCategory = 'Please select a category';
            isValid = false;
        }
        
        this.displayUploadFormErrors(errors);
        return isValid;
    }

    displayUploadFormErrors(errors) {
        // Clear existing errors
        document.querySelectorAll('.field-error').forEach(el => {
            el.textContent = '';
            const input = el.previousElementSibling;
            if (input) input.classList.remove('error');
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

    async loadImageLibrary() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            const grid = document.getElementById('imageLibraryGrid');
            grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading images...</div>';
            
            const params = {
                page: this.currentPage,
                limit: this.imagesPerPage,
                ...this.currentFilter
            };
            
            const response = await window.api.getImages(params);
            
            if (response.success) {
                this.images = response.data.images;
                this.renderImageGrid(this.images);
                this.renderPagination(response.data.pagination);
            } else {
                throw new Error(response.message || 'Failed to load images');
            }
            
        } catch (error) {
            console.error('Error loading image library:', error);
            const grid = document.getElementById('imageLibraryGrid');
            grid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <h3>Error Loading Images</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="imageManager.loadImageLibrary()">
                        <i class="fas fa-retry"></i> Try Again
                    </button>
                </div>
            `;
        } finally {
            this.isLoading = false;
        }
    }

    renderImageGrid(images) {
        const grid = document.getElementById('imageLibraryGrid');
        
        if (images.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images fa-3x"></i>
                    <h3>No Images Found</h3>
                    <p>Upload some images to get started.</p>
                    <button class="btn btn-primary" onclick="imageManager.showUploadModal()">
                        <i class="fas fa-plus"></i> Upload Images
                    </button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = images.map(image => `
            <div class="image-library-item ${this.selectedImages.has(image._id) ? 'selected' : ''}" 
                data-image-id="${image._id}">
                <div class="image-thumbnail">
                    <img src="${image.thumbnailUrl}" alt="${image.alt}" loading="lazy">
                    <div class="image-overlay">
                        <div class="image-actions">
                            <button class="btn btn-sm btn-outline" onclick="imageManager.viewImageDetails('${image._id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="imageManager.editImage('${image._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                    <div class="image-checkbox">
                        <input type="checkbox" ${this.selectedImages.has(image._id) ? 'checked' : ''} 
                            onchange="imageManager.toggleImageSelection('${image._id}', this.checked)">
                    </div>
                </div>
                <div class="image-info">
                    <div class="image-title" title="${image.title}">${image.title}</div>
                    <div class="image-meta">
                        <span class="image-category">${image.seo?.category || 'general'}</span>
                        <span class="image-size">${image.formattedSize}</span>
                    </div>
                    ${image.usageCount > 0 ? `<div class="image-usage">Used in ${image.usageCount} items</div>` : ''}
                </div>
            </div>
        `).join('');
        
        this.updateSelectionCount();
    }

    toggleImageSelection(imageId, selected) {
        if (selected) {
            this.selectedImages.add(imageId);
        } else {
            this.selectedImages.delete(imageId);
        }
        
        const item = document.querySelector(`[data-image-id="${imageId}"]`);
        if (item) {
            item.classList.toggle('selected', selected);
        }
        
        this.updateSelectionCount();
    }

    selectAllImages() {
        this.images.forEach(image => {
            this.selectedImages.add(image._id);
            const item = document.querySelector(`[data-image-id="${image._id}"]`);
            if (item) {
                item.classList.add('selected');
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.checked = true;
            }
        });
        this.updateSelectionCount();
    }

    clearSelection() {
        this.selectedImages.clear();
        document.querySelectorAll('.image-library-item').forEach(item => {
            item.classList.remove('selected');
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = false;
        });
        this.updateSelectionCount();
    }

    updateSelectionCount() {
        const countEl = document.getElementById('imageSelectionCount');
        if (countEl) {
            countEl.textContent = `${this.selectedImages.size} selected`;
        }
    }

    confirmImageSelection() {
        const selectedImageIds = Array.from(this.selectedImages);
        const selectedImages = this.images.filter(img => selectedImageIds.includes(img._id));
        
        // Trigger custom event with selected images
        window.dispatchEvent(new CustomEvent('imagesSelected', {
            detail: { images: selectedImages }
        }));
        
        window.hideModal('imageLibraryModal');
        window.auth.showToast(`Selected ${selectedImages.length} image(s)`, 'success');
    }

    applyFilters() {
        this.currentFilter.search = document.getElementById('imageSearch').value.trim();
        this.currentFilter.category = document.getElementById('imageCategoryFilter').value;
        this.currentPage = 1;
        this.loadImageLibrary();
    }

    clearFilters() {
        document.getElementById('imageSearch').value = '';
        document.getElementById('imageCategoryFilter').value = '';
        this.currentFilter = { category: '', tags: [], search: '' };
        this.currentPage = 1;
        this.loadImageLibrary();
    }

    setupTagInput(input, wrapperID) {
        const wrapper = document.getElementById(wrapperID);
        this.uploadTags = [];
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = input.value.trim().toLowerCase();
                if (tag && !this.uploadTags.includes(tag)) {
                    this.uploadTags.push(tag);
                    input.value = '';
                    this.renderTags(wrapperID, this.uploadTags);
                }
            }
        });
        
        input.addEventListener('blur', () => {
            const tag = input.value.trim().toLowerCase();
            if (tag && !this.uploadTags.includes(tag)) {
                this.uploadTags.push(tag);
                input.value = '';
                this.renderTags(wrapperID, this.uploadTags);
            }
        });
    }

    renderTags(wrapperID, tags) {
        const wrapper = document.getElementById(wrapperID);
        const input = wrapper.querySelector('.tag-input');
        
        // Remove existing tags
        wrapper.querySelectorAll('.tag').forEach(tag => tag.remove());
        
        // Add tags before input
        tags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                ${tag}
                <button type="button" class="tag-remove" onclick="imageManager.removeUploadTag('${tag}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            wrapper.insertBefore(tagElement, input);
        });
    }

    removeUploadTag(tag) {
        this.uploadTags = this.uploadTags.filter(t => t !== tag);
        this.renderTags('imageTagsWrapper', this.uploadTags);
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    renderPagination(pagination) {
        const container = document.getElementById('imageLibraryPagination');
        if (!container || pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<div class="pagination">';
        
        // Previous button
        if (pagination.hasPrevPage) {
            paginationHTML += `<button class="btn btn-outline btn-sm" onclick="imageManager.goToPage(${pagination.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>`;
        }
        
        // Page numbers
        for (let i = Math.max(1, pagination.currentPage - 2); i <= Math.min(pagination.totalPages, pagination.currentPage + 2); i++) {
            if (i === pagination.currentPage) {
                paginationHTML += `<button class="btn btn-primary btn-sm">${i}</button>`;
            } else {
                paginationHTML += `<button class="btn btn-outline btn-sm" onclick="imageManager.goToPage(${i})">${i}</button>`;
            }
        }
        
        // Next button
        if (pagination.hasNextPage) {
            paginationHTML += `<button class="btn btn-outline btn-sm" onclick="imageManager.goToPage(${pagination.currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>`;
        }
        
        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadImageLibrary();
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add image management styles
const imageStyles = document.createElement('style');
imageStyles.textContent = `
    .large-modal .modal-content {
        width: 90vw;
        max-width: 1200px;
        max-height: 90vh;
    }
    
    .image-library-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--gray-200);
    }
    
    .search-filters {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    
    .library-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    
    .selection-count {
        font-size: 0.875rem;
        color: var(--gray-600);
    }
    
    .image-library-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        min-height: 400px;
    }
    
    .image-library-item {
        border: 2px solid transparent;
        border-radius: var(--border-radius);
        overflow: hidden;
        transition: all 0.2s ease;
        background: var(--white);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .image-library-item:hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
    }
    
    .image-library-item.selected {
        border-color: var(--primary-color);
        box-shadow: 0 4px 8px rgba(99, 102, 241, 0.25);
    }
    
    .image-thumbnail {
        position: relative;
        aspect-ratio: 1;
        overflow: hidden;
    }
    
    .image-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    
    .image-library-item:hover .image-overlay {
        opacity: 1;
    }
    
    .image-actions {
        display: flex;
        gap: 0.5rem;
    }
    
    .image-checkbox {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
    }
    
    .image-checkbox input[type="checkbox"] {
        width: 1.25rem;
        height: 1.25rem;
        cursor: pointer;
    }
    
    .image-info {
        padding: 0.75rem;
    }
    
    .image-title {
        font-weight: 500;
        margin-bottom: 0.25rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .image-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
        color: var(--gray-600);
        margin-bottom: 0.25rem;
    }
    
    .image-category {
        background: var(--gray-100);
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        text-transform: capitalize;
    }
    
    .image-usage {
        font-size: 0.75rem;
        color: var(--success-color);
        font-weight: 500;
    }
    
    .image-preview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
    }
    
    .image-preview-item {
        border: 1px solid var(--gray-200);
        border-radius: var(--border-radius);
        overflow: hidden;
        background: var(--white);
    }
    
    .image-preview-item img {
        width: 100%;
        height: 150px;
        object-fit: cover;
    }
    
    .image-preview-info {
        padding: 0.75rem;
    }
    
    .image-preview-name {
        font-weight: 500;
        margin-bottom: 0.25rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .image-preview-size {
        font-size: 0.75rem;
        color: var(--gray-600);
        margin-bottom: 0.5rem;
    }
    
    .image-title-input,
    .image-alt-input {
        margin-bottom: 0.5rem;
    }
    
    .pagination {
        display: flex;
        justify-content: center;
        gap: 0.25rem;
        margin-top: 1rem;
    }
    
    .recent-images-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .recent-image-item {
        border: 1px solid var(--gray-200);
        border-radius: var(--border-radius);
        overflow: hidden;
        background: var(--white);
        transition: transform 0.2s ease;
    }
    
    .recent-image-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .recent-image-thumbnail {
        aspect-ratio: 16/9;
        overflow: hidden;
    }
    
    .recent-image-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .recent-image-info {
        padding: 0.75rem;
    }
    
    .recent-image-title {
        font-weight: 500;
        margin-bottom: 0.25rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .recent-image-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: var(--gray-600);
    }
    
    .recent-image-category {
        background: var(--gray-100);
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        text-transform: capitalize;
    }
    
    .category-stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--gray-100);
    }
    
    .category-stat-item:last-child {
        border-bottom: none;
    }
    
    .category-name {
        text-transform: capitalize;
        color: var(--gray-700);
    }
    
    .category-count {
        font-weight: 600;
        color: var(--primary-color);
    }
`;
document.head.appendChild(imageStyles);

// Initialize image manager
const imageManager = new ImageManager();
window.imageManager = imageManager;