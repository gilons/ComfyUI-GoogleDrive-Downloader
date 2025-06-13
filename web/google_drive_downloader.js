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
                        <input type="text" id="gdrive-custom-path" name="custom_path" placeholder="/path/to/custom/directory">
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

    closeModal() {
        if (this.modal) {
            document.body.removeChild(this.modal);
            this.modal = null;
        }
        this.isDownloading = false;
    }

    showProgress(message) {
        if (!this.modal) return;
        
        const progress = this.modal.querySelector('#gdrive-progress');
        const progressText = this.modal.querySelector('.gdrive-progress-text');
        
        progress.style.display = 'block';
        progressText.textContent = message;
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
        
        this.isDownloading = true;
        this.setFormEnabled(false);
        this.showMessage('', false); // Clear previous messages
        
        const formData = new FormData(e.target);
        const data = {
            google_drive_url: formData.get('url'),
            filename: formData.get('filename'),
            model_type: formData.get('model_type'),
            custom_path: formData.get('custom_path') || '',
            overwrite: formData.has('overwrite'),
            auto_extract_zip: formData.has('auto_extract_zip')
        };

        try {
            this.showProgress('Starting download...');

            const response = await api.fetchApi('/google_drive_download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.hideProgress();
                this.showMessage(`✅ ${result.message}\nFile saved to: ${result.file_path}`, false);
                
                // Auto-close after success (optional)
                setTimeout(() => {
                    this.closeModal();
                }, 3000);
            } else {
                this.hideProgress();
                this.showMessage(`❌ Download failed: ${result.error}`, true);
            }

        } catch (error) {
            this.hideProgress();
            this.showMessage(`❌ Network error: ${error.message}`, true);
        } finally {
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
        const menu = document.querySelector('.comfy-menu');
        if (menu) {
            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = `
                <svg class="gdrive-icon" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    <path d="M12,19L8,15H10.5V12H13.5V15H16L12,19Z"/>
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
