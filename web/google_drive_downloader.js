import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
.gdrive-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
}

.gdrive-modal-content {
    background: var(--comfy-menu-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
    width: 500px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
}

.gdrive-form-group {
    margin-bottom: 15px;
}

.gdrive-form-group label {
    display: block;
    margin-bottom: 5px;
    color: var(--input-text);
    font-weight: bold;
}

.gdrive-form-group input,
.gdrive-form-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--comfy-input-bg);
    color: var(--input-text);
    box-sizing: border-box;
}

.gdrive-form-group input[type="checkbox"] {
    width: auto;
    margin-right: 8px;
}

.gdrive-checkbox-group {
    display: flex;
    align-items: center;
}

.gdrive-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

.gdrive-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.gdrive-btn-primary {
    background-color: #007bff;
    color: white;
}

.gdrive-btn-primary:hover {
    background-color: #0056b3;
}

.gdrive-btn-secondary {
    background-color: #6c757d;
    color: white;
}

.gdrive-btn-secondary:hover {
    background-color: #545b62;
}

.gdrive-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.gdrive-progress {
    margin-top: 15px;
    padding: 10px;
    background-color: var(--comfy-input-bg);
    border-radius: 4px;
    border: 1px solid var(--border-color);
}

.gdrive-progress-text {
    color: var(--input-text);
    margin-bottom: 8px;
}

.gdrive-progress-bar {
    width: 100%;
    height: 6px;
    background-color: var(--border-color);
    border-radius: 3px;
    overflow: hidden;
}

.gdrive-progress-fill {
    height: 100%;
    background-color: #007bff;
    width: 0%;
    transition: width 0.3s ease;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

.gdrive-error {
    color: #dc3545;
    margin-top: 10px;
    padding: 8px;
    background-color: rgba(220, 53, 69, 0.1);
    border-radius: 4px;
    border: 1px solid rgba(220, 53, 69, 0.3);
}

.gdrive-success {
    color: #28a745;
    margin-top: 10px;
    padding: 8px;
    background-color: rgba(40, 167, 69, 0.1);
    border-radius: 4px;
    border: 1px solid rgba(40, 167, 69, 0.3);
}

.gdrive-icon {
    width: 20px;
    height: 20px;
    fill: currentColor;
}
`;
document.head.appendChild(style);

class GoogleDriveDownloader {
    constructor() {
        this.modal = null;
        this.isDownloading = false;
        this.progressInterval = null;
        this.currentSessionId = null;
    }

    createModal() {
        const modal = document.createElement('div');
        modal.className = 'gdrive-modal';
        modal.innerHTML = `
            <div class="gdrive-modal-content">
                <h3>Download from Google Drive</h3>
                <form id="gdrive-form">
                    <div class="gdrive-form-group">
                        <label for="gdrive-url">Google Drive URL or File ID:</label>
                        <input type="text" id="gdrive-url" name="url" placeholder="https://drive.google.com/file/d/FILE_ID/view" required>
                    </div>
                    
                    <div class="gdrive-form-group">
                        <label for="gdrive-filename">Filename:</label>
                        <input type="text" id="gdrive-filename" name="filename" placeholder="model.safetensors" required>
                    </div>
                    
                    <div class="gdrive-form-group">
                        <label for="gdrive-model-type">Model Type:</label>
                        <select id="gdrive-model-type" name="model_type" required>
                            <option value="checkpoints">Checkpoints</option>
                            <option value="vae">VAE</option>
                            <option value="loras">LoRA</option>
                            <option value="controlnet">ControlNet</option>
                            <option value="embeddings">Embeddings</option>
                            <option value="upscale_models">Upscale Models</option>
                            <option value="custom">Custom Path</option>
                        </select>
                    </div>
                    
                    <div class="gdrive-form-group" id="gdrive-custom-path-group" style="display: none;">
                        <label for="gdrive-custom-path">Custom Path:</label>
                        <input type="text" id="gdrive-custom-path" name="custom_path" placeholder="eg: models/custom">
                    </div>
                    
                    <div class="gdrive-form-group">
                        <div class="gdrive-checkbox-group">
                            <input type="checkbox" id="gdrive-overwrite" name="overwrite">
                            <label for="gdrive-overwrite">Overwrite existing files</label>
                        </div>
                    </div>
                    
                    <div class="gdrive-form-group">
                        <div class="gdrive-checkbox-group">
                            <input type="checkbox" id="gdrive-auto-extract" name="auto_extract_zip" checked>
                            <label for="gdrive-auto-extract">Auto-extract zip files</label>
                        </div>
                    </div>
                    
                    <div id="gdrive-progress" class="gdrive-progress" style="display: none;">
                        <div class="gdrive-progress-text">Preparing download...</div>
                        <div class="gdrive-progress-bar">
                            <div class="gdrive-progress-fill"></div>
                        </div>
                    </div>
                    
                    <div id="gdrive-message"></div>
                    
                    <div class="gdrive-buttons">
                        <button type="button" class="gdrive-btn gdrive-btn-secondary" id="gdrive-cancel">Cancel</button>
                        <button type="submit" class="gdrive-btn gdrive-btn-primary" id="gdrive-download">Download</button>
                    </div>
                </form>
            </div>
        `;

        // Event listeners
        const modelTypeSelect = modal.querySelector('#gdrive-model-type');
        const customPathGroup = modal.querySelector('#gdrive-custom-path-group');
        
        modelTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customPathGroup.style.display = 'block';
            } else {
                customPathGroup.style.display = 'none';
            }
        });

        const form = modal.querySelector('#gdrive-form');
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        const cancelBtn = modal.querySelector('#gdrive-cancel');
        cancelBtn.addEventListener('click', () => this.closeModal());

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        return modal;
    }

    showModal() {
        if (this.modal) {
            this.closeModal();
        }
        
        this.modal = this.createModal();
        document.body.appendChild(this.modal);
        
        // Focus on URL input
        setTimeout(() => {
            this.modal.querySelector('#gdrive-url').focus();
        }, 100);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async pollProgress(sessionId) {
        if (!this.modal || !this.isDownloading) return;
        
        try {
            const response = await api.fetchApi(`/google_drive_progress/${sessionId}`);
            const progress = await response.json();
            
            if (progress.status === 'progress' || progress.status === 'starting') {
                this.showProgress(progress.message, progress.percentage || 0);
            } else if (progress.status === 'completed') {
                this.showProgress(progress.message, 100);
                setTimeout(() => {
                    this.hideProgress();
                    this.showMessage(`✅ ${progress.message}`, false);
                    this.stopProgressPolling();
                    
                    // Re-enable form but keep modal open
                    this.isDownloading = false;
                    this.setFormEnabled(true);
                }, 500);
            } else if (progress.status === 'error') {
                this.hideProgress();
                this.showMessage(`❌ ${progress.message}`, true);
                this.stopProgressPolling();
                
                // Re-enable form but keep modal open
                this.isDownloading = false;
                this.setFormEnabled(true);
            }
        } catch (error) {
            console.error('Error polling progress:', error);
        }
    }

    startProgressPolling(sessionId) {
        this.currentSessionId = sessionId;
        this.progressInterval = setInterval(() => {
            this.pollProgress(sessionId);
        }, 500); // Poll every 500ms
    }

    stopProgressPolling() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        this.currentSessionId = null;
    }

    closeModal() {
        this.stopProgressPolling();
        if (this.modal) {
            document.body.removeChild(this.modal);
            this.modal = null;
        }
        this.isDownloading = false;
    }

    showProgress(message, percentage = 0) {
        if (!this.modal) return;
        
        const progress = this.modal.querySelector('#gdrive-progress');
        const progressText = this.modal.querySelector('.gdrive-progress-text');
        const progressFill = this.modal.querySelector('.gdrive-progress-fill');
        
        progress.style.display = 'block';
        progressText.textContent = `${message} (${Math.round(percentage)}%)`;
        progressFill.style.width = `${percentage}%`;
    }

    hideProgress() {
        if (!this.modal) return;
        
        const progress = this.modal.querySelector('#gdrive-progress');
        progress.style.display = 'none';
    }

    showMessage(message, isError = false) {
        if (!this.modal) return;
        
        const messageDiv = this.modal.querySelector('#gdrive-message');
        messageDiv.className = isError ? 'gdrive-error' : 'gdrive-success';
        messageDiv.textContent = message;
    }

    setFormEnabled(enabled) {
        if (!this.modal) return;
        
        const form = this.modal.querySelector('#gdrive-form');
        const inputs = form.querySelectorAll('input, select, button');
        
        inputs.forEach(input => {
            if (input.id === 'gdrive-cancel') {
                input.disabled = false; // Always keep cancel enabled
            } else {
                input.disabled = !enabled;
            }
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isDownloading) return;
        
        // Clear any previous messages when starting a new download
        this.showMessage('', false);
        
        // Create FormData before disabling form elements
        const formData = new FormData(e.target);
        const sessionId = this.generateSessionId();
        
        this.isDownloading = true;
        this.setFormEnabled(false);
        
        const data = {
            google_drive_url: formData.get('url'),
            filename: formData.get('filename'),
            model_type: formData.get('model_type'),
            custom_path: formData.get('custom_path') || '',
            overwrite: formData.has('overwrite'),
            auto_extract_zip: formData.has('auto_extract_zip'),
            session_id: sessionId
        };

        try {
            this.showProgress('Starting download...', 0);
            this.startProgressPolling(sessionId);

            const response = await api.fetchApi('/google_drive_download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            // Stop polling since we got the final result
            this.stopProgressPolling();

            if (result.success) {
                this.showProgress('Download completed!', 100);
                setTimeout(() => {
                    this.hideProgress();
                    this.showMessage(`✅ ${result.message}\nFile saved to: ${result.file_path}`, false);
                }, 500);
            } else {
                this.hideProgress();
                this.showMessage(`❌ Download failed: ${result.error}`, true);
            }

        } catch (error) {
            this.stopProgressPolling();
            this.hideProgress();
            this.showMessage(`❌ Network error: ${error.message}`, true);
        } finally {
            // Always re-enable the form and keep modal open
            this.isDownloading = false;
            this.setFormEnabled(true);
        }
    }
}

// Create global instance
const googleDriveDownloader = new GoogleDriveDownloader();

// Add button to ComfyUI interface
app.registerExtension({
    name: "GoogleDriveDownloader",
    async setup() {
        // Add download button to the top menu bar
        const menu = document.querySelector('.comfyui-menu-right');
        if (menu) {
            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 32 32" fill="none">
<path d="M2 11.9556C2 8.47078 2 6.7284 2.67818 5.39739C3.27473 4.22661 4.22661 3.27473 5.39739 2.67818C6.7284 2 8.47078 2 11.9556 2H20.0444C23.5292 2 25.2716 2 26.6026 2.67818C27.7734 3.27473 28.7253 4.22661 29.3218 5.39739C30 6.7284 30 8.47078 30 11.9556V20.0444C30 23.5292 30 25.2716 29.3218 26.6026C28.7253 27.7734 27.7734 28.7253 26.6026 29.3218C25.2716 30 23.5292 30 20.0444 30H11.9556C8.47078 30 6.7284 30 5.39739 29.3218C4.22661 28.7253 3.27473 27.7734 2.67818 26.6026C2 25.2716 2 23.5292 2 20.0444V11.9556Z" fill="white"/>
<path d="M16.0019 12.4507L12.541 6.34297C12.6559 6.22598 12.7881 6.14924 12.9203 6.09766C11.8998 6.43355 11.4315 7.57961 11.4315 7.57961L5.10895 18.7345C5.01999 19.0843 4.99528 19.4 5.0064 19.6781H11.9072L16.0019 12.4507Z" fill="#34A853"/>
<path d="M16.002 12.4507L20.0967 19.6781H26.9975C27.0086 19.4 26.9839 19.0843 26.8949 18.7345L20.5724 7.57961C20.5724 7.57961 20.1029 6.43355 19.0835 6.09766C19.2145 6.14924 19.3479 6.22598 19.4628 6.34297L16.002 12.4507Z" fill="#FBBC05"/>
<path d="M16.0019 12.4514L19.4628 6.34371C19.3479 6.22671 19.2144 6.14997 19.0835 6.09839C18.9327 6.04933 18.7709 6.01662 18.5954 6.00781H18.4125H13.5913H13.4084C13.2342 6.01536 13.0711 6.04807 12.9203 6.09839C12.7894 6.14997 12.6559 6.22671 12.541 6.34371L16.0019 12.4514Z" fill="#188038"/>
<path d="M11.9082 19.6782L8.48687 25.7168C8.48687 25.7168 8.3732 25.6614 8.21875 25.5469C8.70434 25.9206 9.17633 25.9998 9.17633 25.9998H22.6134C23.3547 25.9998 23.5092 25.7168 23.5092 25.7168C23.5116 25.7155 23.5129 25.7142 23.5153 25.713L20.0965 19.6782H11.9082Z" fill="#4285F4"/>
<path d="M11.9086 19.6782H5.00781C5.04241 20.4985 5.39826 20.9778 5.39826 20.9778L5.65773 21.4281C5.67627 21.4546 5.68739 21.4697 5.68739 21.4697L6.25205 22.461L7.51976 24.6676C7.55683 24.7569 7.60008 24.8386 7.6458 24.9166C7.66309 24.9431 7.67915 24.972 7.69769 24.9972C7.70263 25.0047 7.70757 25.0123 7.71252 25.0198C7.86944 25.2412 8.04489 25.4123 8.22034 25.5469C8.37479 25.6627 8.48847 25.7168 8.48847 25.7168L11.9086 19.6782Z" fill="#1967D2"/>
<path d="M20.0967 19.6782H26.9974C26.9628 20.4985 26.607 20.9778 26.607 20.9778L26.3475 21.4281C26.329 21.4546 26.3179 21.4697 26.3179 21.4697L25.7532 22.461L24.4855 24.6676C24.4484 24.7569 24.4052 24.8386 24.3595 24.9166C24.3422 24.9431 24.3261 24.972 24.3076 24.9972C24.3026 25.0047 24.2977 25.0123 24.2927 25.0198C24.1358 25.2412 23.9604 25.4123 23.7849 25.5469C23.6305 25.6627 23.5168 25.7168 23.5168 25.7168L20.0967 19.6782Z" fill="#EA4335"/>
</svg>
            `;
            downloadBtn.title = 'Download from Google Drive';
            downloadBtn.style.cssText = `
                background: none;
                border: none;
                padding: 4px;
                margin: 0 4px;
                cursor: pointer;
                color: var(--input-text);
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            downloadBtn.addEventListener('click', () => {
                googleDriveDownloader.showModal();
            });
            
            menu.appendChild(downloadBtn);
        }
    }
});
