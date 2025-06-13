from .google_drive_downloader import GoogleDriveDownloader

NODE_CLASS_MAPPINGS = {
    "GoogleDriveDownloader": GoogleDriveDownloader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GoogleDriveDownloader": "Google Drive Downloader"
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
