# ComfyUI Google Drive Downloader (Integrated into File System Manager)

This extension's Google Drive download functionality is now primarily integrated into the **ComfyUI File System Manager** extension. It allows users to download publicly shared Google Drive files directly into their ComfyUI file system, with automatic zip extraction support.

**Note:** The standalone header icon and interface for this extension are deprecated. Please use the "Upload File" -> "Google Drive" option within the File System Manager.

## Features (via File System Manager)

- **Integrated Upload Option**: Access Google Drive downloads through the File System Manager's "Upload" interface.
- **Modal Interface**: Clean popup interface for entering download details (URL, filename, extension).
- **Real-time Progress**: Live progress updates during download within the File System Manager's upload modal.
- **Error Handling**: Clear error messages.
- Download files directly from Google Drive URLs.
- Automatic zip extraction for large files.
- Support for all ComfyUI model types (checkpoints, VAE, LoRA, ControlNet, etc.) by allowing download to the current directory in File System Manager.
- Custom destination paths are handled by navigating to the desired directory in File System Manager before initiating the Google Drive upload.
- Overwrite protection.
- Playwright-based downloading for reliable handling of Google Drive's download mechanisms.

## Installation

The necessary dependencies (`playwright`) and setup (Playwright browser installation) are now handled by the **ComfyUI File System Manager** extension.

1.  Ensure `ComfyUI File System Manager` is installed and up to date.
2.  If you had this `ComfyUI-GoogleDrive-Downloader` node installed previously, its core Python logic is still used by the File System Manager, but its UI is no longer active.

### Manual Installation (If keeping this node for backend logic used by FSM)

If you are maintaining this node because its Python backend is directly imported by File System Manager (not the case with the current refactoring approach, which copies the logic):
```bash
cd ComfyUI/custom_nodes
# git clone https://github.com/YOUR_USERNAME/ComfyUI-GoogleDrive-Downloader.git # If not already cloned
cd ComfyUI-GoogleDrive-Downloader
# pip install -r requirements.txt # Dependencies are now in File System Manager
# python install.py # Playwright browser installation is now in File System Manager
# Restart ComfyUI
```

## Usage (via File System Manager)

1.  **Open the File System Manager** in ComfyUI.
2.  **Navigate to the desired target directory** where you want to save the file.
3.  **Click the "Upload File" button.**
4.  **Select the "Google Drive" option.**
5.  **Enter the Google Drive URL or File ID.**
6.  **Enter the desired Filename (without extension) and Extension.**
7.  **Choose "Overwrite existing" or "Auto Extract Zip" options as needed.**
8.  **Click "Start Upload"** to begin the download process.
9.  **Monitor progress** in the upload modal.
10. **Check results** - success message or error details will be displayed.

### Interface Fields (within File System Manager's Google Drive Upload)

- **Google Drive URL/File ID**: The Google Drive share URL or file ID.
- **Filename (without extension)**: Target filename for the downloaded file (e.g., "my_model").
- **Extension**: File extension (e.g., "safetensors", "ckpt", "zip").
- **Overwrite Existing**: Checkbox to overwrite existing files.
- **Auto Extract Zip**: Checkbox to automatically extract zip files.

### Progress Indicators

- **Download Status**: Real-time progress messages within the File System Manager upload form.
- **File Size**: Shown upon completion.
- **Extraction Status**: Progress for zip file extraction.
- **Success/Error Messages**: Clear feedback on completion.

## Supported URL Formats

- `https://drive.google.com/file/d/FILE_ID/view`
- `https://drive.google.com/open?id=FILE_ID`
- `https://drive.google.com/uc?id=FILE_ID`
- Direct file ID: `FILE_ID`

## Requirements (Handled by File System Manager)

- Python 3.8+
- ComfyUI
- Playwright
- aiofiles

## Troubleshooting

1. Ensure the Google Drive file is publicly accessible (shared with "Anyone with the link").
2. For large files, Google Drive may zip them - enable auto_extract_zip.
3. Check ComfyUI console for detailed error messages.

## License

MIT License
