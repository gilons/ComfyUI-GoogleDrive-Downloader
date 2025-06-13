import subprocess
import sys
import os

def install_playwright_browsers():
    """Install Playwright browsers"""
    try:
        print("Installing Playwright browsers...")
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        print("✅ Playwright browsers installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install Playwright browsers: {e}")
        return False
    return True

if __name__ == "__main__":
    install_playwright_browsers()
