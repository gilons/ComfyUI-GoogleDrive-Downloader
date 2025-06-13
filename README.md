# ComfyUI Google Drive Downloader

A ComfyUI custom node that downloads publicly shared Google Drive files using Playwright, with automatic zip extraction support.

## Features

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

### Manual Installation

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/YOUR_USERNAME/ComfyUI-GoogleDrive-Downloader.git
cd ComfyUI-GoogleDrive-Downloader
pip install -r requirements.txt
python install.py
```

## Usage

1. Add the "Google Drive Downloader" node to your workflow
2. Paste a Google Drive share URL (e.g., `https://drive.google.com/file/d/FILE_ID/view`)
3. Set the filename and model type
4. Connect and execute

### Input Parameters

- **google_drive_url**: The Google Drive share URL or file ID
- **filename**: Target filename for the downloaded file
- **model_type**: Destination folder type (checkpoints, vae, loras, etc.)
- **custom_path**: Custom destination path (when model_type is "custom")
- **overwrite**: Whether to overwrite existing files
- **auto_extract_zip**: Automatically extract zip files (useful for large files)

### Output

- **file_path**: Path to the downloaded/extracted file
- **success**: Boolean indicating download success

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
