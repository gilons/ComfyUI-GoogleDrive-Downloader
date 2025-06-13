import os
import re
import asyncio
import aiofiles
import zipfile
import tempfile
from pathlib import Path
from playwright.async_api import async_playwright
import folder_paths

class GoogleDriveDownloader:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "google_drive_url": ("STRING", {
                    "multiline": False,
                    "default": "https://drive.google.com/file/d/YOUR_FILE_ID/view"
                }),
                "filename": ("STRING", {
                    "multiline": False,
                    "default": "downloaded_file.safetensors"
                }),
                "model_type": (["checkpoints", "vae", "loras", "controlnet", "embeddings", "upscale_models", "custom"], {
                    "default": "checkpoints"
                }),
                "custom_path": ("STRING", {
                    "multiline": False,
                    "default": ""
                }),
                "overwrite": ("BOOLEAN", {
                    "default": False
                }),
                "auto_extract_zip": ("BOOLEAN", {
                    "default": True
                })
            }
        }

    RETURN_TYPES = ("STRING", "BOOLEAN")
    RETURN_NAMES = ("file_path", "success")
    FUNCTION = "download_file"
    CATEGORY = "utils"
    DESCRIPTION = "Download files from Google Drive using Playwright with zip extraction support"

    def __init__(self):
        self.comfyui_base = folder_paths.base_path

    def extract_file_id(self, url):
        """Extract file ID from various Google Drive URL formats"""
        patterns = [
            r'/file/d/([a-zA-Z0-9_-]+)',
            r'id=([a-zA-Z0-9_-]+)',
            r'/open\?id=([a-zA-Z0-9_-]+)',
            r'^([a-zA-Z0-9_-]{25,})$'  # Direct file ID
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        raise ValueError(f"Could not extract file ID from URL: {url}")

    def get_download_path(self, model_type, custom_path, filename):
        """Determine the download path based on model type"""
        if model_type == "custom" and custom_path:
            base_path = Path(custom_path)
        else:
            # Map model types to ComfyUI model directories
            model_dirs = {
                "checkpoints": "checkpoints",
                "vae": "vae", 
                "loras": "loras",
                "controlnet": "controlnet",
                "embeddings": "embeddings",
                "upscale_models": "upscale_models"
            }
            
            model_dir = model_dirs.get(model_type, "checkpoints")
            base_path = Path(self.comfyui_base) / "models" / model_dir
        
        # Ensure directory exists
        base_path.mkdir(parents=True, exist_ok=True)
        
        return base_path / filename

    def is_zip_file(self, file_path):
        """Check if the downloaded file is a zip archive"""
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                return True
        except (zipfile.BadZipFile, FileNotFoundError):
            return False

    def extract_zip_file(self, zip_path, extract_to, target_filename):
        """Extract zip file and handle the extracted content"""
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                file_list = zip_ref.namelist()
                print(f"📦 Zip contains {len(file_list)} file(s): {file_list}")
                
                # If only one file in zip, extract it with the target filename
                if len(file_list) == 1:
                    extracted_file = file_list[0]
                    # Extract to temporary location first
                    zip_ref.extract(extracted_file, extract_to.parent)
                    
                    # Move and rename the extracted file
                    temp_extracted_path = extract_to.parent / extracted_file
                    final_path = extract_to
                    
                    if temp_extracted_path != final_path:
                        if final_path.exists():
                            final_path.unlink()
                        temp_extracted_path.rename(final_path)
                    
                    print(f"✅ Extracted single file: {extracted_file} -> {final_path}")
                    return str(final_path), True
                
                # Multiple files - extract all to a directory
                else:
                    # Create a directory based on the target filename (without extension)
                    extract_dir = extract_to.parent / extract_to.stem
                    extract_dir.mkdir(exist_ok=True)
                    
                    zip_ref.extractall(extract_dir)
                    print(f"✅ Extracted {len(file_list)} files to: {extract_dir}")
                    
                    # Return the directory path
                    return str(extract_dir), True
                    
        except Exception as e:
            print(f"❌ Error extracting zip file: {e}")
            return str(zip_path), False

    async def download_with_playwright(self, file_id, download_path, is_temp_download=False):
        """Download file using Playwright to handle Google Drive's download mechanisms"""
        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        
        # Use temporary file for potential zip downloads
        if is_temp_download:
            temp_dir = Path(tempfile.gettempdir())
            temp_download_path = temp_dir / f"gdrive_temp_{file_id}.tmp"
        else:
            temp_download_path = download_path
        
        async with async_playwright() as p:
            # Use chromium for better compatibility
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            
            try:
                context = await browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                )
                
                page = await context.new_page()
                
                # Set up download handling
                download_info = {"path": None, "completed": False, "filename": None}
                
                async def handle_download(download):
                    await download.save_as(temp_download_path)
                    download_info["path"] = temp_download_path
                    download_info["filename"] = download.suggested_filename
                    download_info["completed"] = True
                
                page.on("download", handle_download)
                
                # Navigate to download URL
                await page.goto(download_url, wait_until="networkidle")
                
                # Handle different Google Drive download scenarios
                try:
                    # Check for direct download
                    if not download_info["completed"]:
                        # Look for download button (large files)
                        download_button = page.locator('a:has-text("Download anyway")')
                        if await download_button.count() > 0:
                            await download_button.click()
                            await page.wait_for_timeout(2000)
                        
                        # Alternative download button selectors
                        if not download_info["completed"]:
                            selectors = [
                                '[aria-label="Download"]',
                                'a[href*="export=download"]',
                                '#uc-download-link'
                            ]
                            
                            for selector in selectors:
                                element = page.locator(selector)
                                if await element.count() > 0:
                                    await element.click()
                                    break
                    
                    # Wait for download to complete
                    timeout = 60000  # 60 seconds for large files
                    elapsed = 0
                    while not download_info["completed"] and elapsed < timeout:
                        await page.wait_for_timeout(1000)
                        elapsed += 1000
                    
                    if not download_info["completed"]:
                        # Fallback: try to get file content directly
                        response = await page.goto(download_url)
                        if response and response.status == 200:
                            content = await response.body()
                            async with aiofiles.open(temp_download_path, 'wb') as f:
                                await f.write(content)
                            download_info["completed"] = True
                
                except Exception as e:
                    print(f"Error during download: {e}")
                    raise
                
            finally:
                await browser.close()
        
        return download_info["completed"], download_info.get("filename", "")

    def download_file(self, google_drive_url, filename, model_type, custom_path="", overwrite=False, auto_extract_zip=True):
        """Main download function with zip extraction support"""
        try:
            # Extract file ID
            file_id = self.extract_file_id(google_drive_url)
            print(f"Extracted file ID: {file_id}")
            
            # Determine download path
            final_download_path = self.get_download_path(model_type, custom_path, filename)
            
            # Check if file exists and overwrite setting
            if final_download_path.exists() and not overwrite:
                print(f"File already exists: {final_download_path}")
                return (str(final_download_path), True)
            
            print(f"Target path: {final_download_path}")
            
            # Download to temporary location first to check if it's a zip
            temp_dir = Path(tempfile.gettempdir())
            temp_download_path = temp_dir / f"gdrive_download_{file_id}.tmp"
            
            # Download using Playwright
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                success, suggested_filename = loop.run_until_complete(
                    self.download_with_playwright(file_id, temp_download_path, is_temp_download=True)
                )
            finally:
                loop.close()
            
            if not success or not temp_download_path.exists():
                print(f"❌ Download failed for {google_drive_url}")
                return ("", False)
            
            file_size = temp_download_path.stat().st_size
            print(f"📥 Downloaded {file_size} bytes to temporary location")
            
            # Check if the downloaded file is a zip and should be extracted
            if auto_extract_zip and self.is_zip_file(temp_download_path):
                print("📦 Detected zip file, extracting...")
                
                try:
                    # Extract the zip file
                    final_path, extract_success = self.extract_zip_file(
                        temp_download_path, 
                        final_download_path,
                        filename
                    )
                    
                    # Clean up temporary zip file
                    temp_download_path.unlink()
                    
                    if extract_success:
                        print(f"✅ Extraction completed: {final_path}")
                        return (final_path, True)
                    else:
                        print(f"❌ Extraction failed, keeping zip file")
                        # Move zip file to final location as fallback
                        temp_download_path.rename(final_download_path)
                        return (str(final_download_path), True)
                        
                except Exception as e:
                    print(f"❌ Error during extraction: {e}")
                    # Move zip file to final location as fallback
                    if temp_download_path.exists():
                        temp_download_path.rename(final_download_path)
                    return (str(final_download_path), True)
            
            else:
                # Not a zip file or extraction disabled, move to final location
                if final_download_path.exists() and overwrite:
                    final_download_path.unlink()
                
                temp_download_path.rename(final_download_path)
                print(f"✅ Download completed: {final_download_path} ({file_size} bytes)")
                return (str(final_download_path), True)
                
        except Exception as e:
            print(f"❌ Error downloading file: {e}")
            return ("", False)
