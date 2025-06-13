import os
import re
import asyncio
import aiofiles
import zipfile
import tempfile
import json
from pathlib import Path
from playwright.async_api import async_playwright
import folder_paths
import server

class GoogleDriveDownloaderAPI:
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

    async def download_with_playwright(self, file_id, download_path, progress_callback=None):
        """Download file using Playwright with progress callbacks"""
        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        
        # Use temporary file for potential zip downloads
        temp_dir = Path(tempfile.gettempdir())
        temp_download_path = temp_dir / f"gdrive_temp_{file_id}.tmp"
        
        if progress_callback:
            progress_callback("Starting download...")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            
            try:
                context = await browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                )
                
                page = await context.new_page()
                
                download_info = {"path": None, "completed": False, "filename": None}
                
                async def handle_download(download):
                    if progress_callback:
                        progress_callback("Download started...")
                    await download.save_as(temp_download_path)
                    download_info["path"] = temp_download_path
                    download_info["filename"] = download.suggested_filename
                    download_info["completed"] = True
                    if progress_callback:
                        progress_callback("Download completed!")
                
                page.on("download", handle_download)
                
                if progress_callback:
                    progress_callback("Connecting to Google Drive...")
                
                await page.goto(download_url, wait_until="networkidle")
                
                # Handle different Google Drive download scenarios
                if not download_info["completed"]:
                    if progress_callback:
                        progress_callback("Looking for download button...")
                    
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
                    if progress_callback and elapsed % 5000 == 0:
                        progress_callback(f"Waiting for download... ({elapsed//1000}s)")
                
                if not download_info["completed"]:
                    if progress_callback:
                        progress_callback("Trying direct download...")
                    # Fallback: try to get file content directly
                    response = await page.goto(download_url)
                    if response and response.status == 200:
                        content = await response.body()
                        async with aiofiles.open(temp_download_path, 'wb') as f:
                            await f.write(content)
                        download_info["completed"] = True
                
            finally:
                await browser.close()
        
        return download_info["completed"], download_info.get("filename", ""), temp_download_path

    async def download_file_async(self, google_drive_url, filename, model_type, custom_path="", overwrite=False, auto_extract_zip=True, progress_callback=None):
        """Async version of download_file with progress callbacks"""
        try:
            if progress_callback:
                progress_callback("Extracting file ID...")
            
            file_id = self.extract_file_id(google_drive_url)
            print(f"Extracted file ID: {file_id}")
            
            final_download_path = self.get_download_path(model_type, custom_path, filename)
            
            if final_download_path.exists() and not overwrite:
                if progress_callback:
                    progress_callback("File already exists!")
                return {"success": True, "file_path": str(final_download_path), "message": "File already exists"}
            
            # Download using Playwright
            success, suggested_filename, temp_download_path = await self.download_with_playwright(
                file_id, final_download_path, progress_callback
            )
            
            if not success or not temp_download_path.exists():
                if progress_callback:
                    progress_callback("Download failed!")
                return {"success": False, "error": "Download failed"}
            
            file_size = temp_download_path.stat().st_size
            if progress_callback:
                progress_callback(f"Downloaded {file_size} bytes")
            
            # Check if the downloaded file is a zip and should be extracted
            if auto_extract_zip and self.is_zip_file(temp_download_path):
                if progress_callback:
                    progress_callback("Extracting zip file...")
                
                try:
                    final_path, extract_success = self.extract_zip_file(
                        temp_download_path, 
                        final_download_path,
                        filename
                    )
                    
                    # Clean up temporary zip file
                    temp_download_path.unlink()
                    
                    if extract_success:
                        if progress_callback:
                            progress_callback("Extraction completed!")
                        return {"success": True, "file_path": final_path, "message": "Download and extraction completed successfully"}
                    else:
                        # Move zip file to final location as fallback
                        temp_download_path.rename(final_download_path)
                        return {"success": True, "file_path": str(final_download_path), "message": "Download completed (extraction failed, kept as zip)"}
                        
                except Exception as e:
                    # Move zip file to final location as fallback
                    if temp_download_path.exists():
                        temp_download_path.rename(final_download_path)
                    return {"success": True, "file_path": str(final_download_path), "message": f"Download completed (extraction error: {e})"}
            
            else:
                # Not a zip file or extraction disabled
                if final_download_path.exists() and overwrite:
                    final_download_path.unlink()
                
                temp_download_path.rename(final_download_path)
                if progress_callback:
                    progress_callback("Download completed!")
                return {"success": True, "file_path": str(final_download_path), "message": f"Download completed successfully ({file_size} bytes)"}
                
        except Exception as e:
            if progress_callback:
                progress_callback(f"Error: {e}")
            return {"success": False, "error": str(e)}

# Initialize the API
google_drive_api = GoogleDriveDownloaderAPI()

@server.PromptServer.instance.routes.post("/google_drive_download")
async def download_google_drive_file(request):
    """API endpoint for Google Drive downloads"""
    try:
        data = await request.json()
        
        required_fields = ['google_drive_url', 'filename', 'model_type']
        for field in required_fields:
            if field not in data:
                return server.web.json_response(
                    {"success": False, "error": f"Missing required field: {field}"}, 
                    status=400
                )
        
        result = await google_drive_api.download_file_async(
            google_drive_url=data['google_drive_url'],
            filename=data['filename'],
            model_type=data['model_type'],
            custom_path=data.get('custom_path', ''),
            overwrite=data.get('overwrite', False),
            auto_extract_zip=data.get('auto_extract_zip', True)
        )
        
        return server.web.json_response(result)
        
    except Exception as e:
        return server.web.json_response(
            {"success": False, "error": str(e)}, 
            status=500
        )

@server.PromptServer.instance.routes.post("/google_drive_download_progress")
async def download_google_drive_file_with_progress(request):
    """API endpoint for Google Drive downloads with real-time progress"""
    try:
        data = await request.json()
        
        # This would need WebSocket implementation for real-time progress
        # For now, return the same as the regular download
        result = await google_drive_api.download_file_async(
            google_drive_url=data['google_drive_url'],
            filename=data['filename'],
            model_type=data['model_type'],
            custom_path=data.get('custom_path', ''),
            overwrite=data.get('overwrite', False),
            auto_extract_zip=data.get('auto_extract_zip', True)
        )
        
        return server.web.json_response(result)
        
    except Exception as e:
        return server.web.json_response(
            {"success": False, "error": str(e)}, 
            status=500
        )
