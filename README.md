# ComfyUI Google Drive Downloader

A ComfyUI web extension that adds a Google Drive download interface directly to the ComfyUI header, allowing users to download publicly shared Google Drive files with automatic zip extraction support.

## Features

- **Header Icon Integration**: Download icon in ComfyUI header for easy access
- **Modal Interface**: Clean popup interface for entering download details
- **Real-time Progress**: Live progress updates during download
- **Error Handling**: Clear error messages and troubleshooting tips
- Download files directly from Google Drive URLs
- Automatic zip extraction for large files
- Support for all ComfyUI model types (checkpoints, VAE, LoRA, ControlNet, etc.)
- Custom destination paths
- Overwrite protection
- Playwright-based downloading for reliable handling of Google Drive's download mechanisms

## Installation

### Automatic Installation (Recommended)

1. Open ComfyUI Manager
2. Click "Install Custom Nodes"
3. Search for "Google Drive Downloader"
4. Click Install
5. Restart ComfyUI

### Manual Installation

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/YOUR_USERNAME/ComfyUI-GoogleDrive-Downloader.git
cd ComfyUI-GoogleDrive-Downloader
pip install -r requirements.txt
python install.py
# Restart ComfyUI
```

## Usage

1. **Look for the download icon** in the ComfyUI header (top toolbar)
2. **Click the download icon** to open the Google Drive downloader modal
3. **Enter the Google Drive URL** (e.g., `https://drive.google.com/file/d/FILE_ID/view`)
4. **Set the filename** and choose the model type destination
5. **Click "Download"** to start the download process
6. **Monitor progress** in the modal - you'll see real-time updates
7. **Check results** - success message or error details will be displayed

### Interface Fields

- **Google Drive URL**: The Google Drive share URL or file ID
- **Filename**: Target filename for the downloaded file
- **Model Type**: Dropdown for destination folder (checkpoints, vae, loras, etc.)
- **Custom Path**: Custom destination path (when model type is "custom")
- **Overwrite Existing**: Checkbox to overwrite existing files
- **Auto Extract Zip**: Checkbox to automatically extract zip files

### Progress Indicators

- **Download Status**: Real-time progress messages
- **File Size**: Shows downloaded file size
- **Extraction Status**: Progress for zip file extraction
- **Success/Error Messages**: Clear feedback on completion

## Supported URL Formats

- `https://drive.google.com/file/d/FILE_ID/view`
- `https://drive.google.com/open?id=FILE_ID`
- `https://drive.google.com/uc?id=FILE_ID`
- Direct file ID: `FILE_ID`

## Requirements

- Python 3.8+
- ComfyUI
- Playwright
- aiofiles

## Troubleshooting

1. Ensure the Google Drive file is publicly accessible (shared with "Anyone with the link")
2. For large files, Google Drive may zip them - enable auto_extract_zip
3. Check ComfyUI console for detailed error messages

## License

MIT License
