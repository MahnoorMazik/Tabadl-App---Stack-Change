# PowerShell script to help set up PWA icons
# This script creates placeholder instructions for generating PWA icons

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "PWA Icons Setup Guide" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$iconSizes = @(72, 96, 128, 144, 152, 192, 384, 512)

Write-Host "Required icon sizes:" -ForegroundColor Yellow
foreach ($size in $iconSizes) {
    Write-Host "  - icon-${size}x${size}.png" -ForegroundColor White
}
Write-Host ""

Write-Host "Icon Requirements:" -ForegroundColor Yellow
Write-Host "  - Format: PNG" -ForegroundColor White
Write-Host "  - Purpose: 'maskable any' (works on all platforms)" -ForegroundColor White
Write-Host "  - Location: public/icons/" -ForegroundColor White
Write-Host ""

Write-Host "How to create icons:" -ForegroundColor Yellow
Write-Host "  1. Create a 512x512px master icon (square, centered content)" -ForegroundColor White
Write-Host "  2. Use an image editor or online tool to resize:" -ForegroundColor White
Write-Host "     - Recommended tools:" -ForegroundColor White
Write-Host "       * https://realfavicongenerator.net/" -ForegroundColor Cyan
Write-Host "       * https://www.pwabuilder.com/imageGenerator" -ForegroundColor Cyan
Write-Host "       * ImageMagick: magick convert icon-512x512.png -resize ${size}x${size} icon-${size}x${size}.png" -ForegroundColor Cyan
Write-Host ""

Write-Host "Quick command (if you have ImageMagick installed):" -ForegroundColor Yellow
foreach ($size in $iconSizes) {
    Write-Host "  magick convert your-icon.png -resize ${size}x${size} public/icons/icon-${size}x${size}.png" -ForegroundColor Cyan
}
Write-Host ""

Write-Host "Note: For now, you can use the existing favicon.png as a placeholder" -ForegroundColor Yellow
Write-Host "      Copy it to all icon sizes until you create proper icons." -ForegroundColor Yellow
Write-Host ""

# Create icons directory if it doesn't exist
if (-not (Test-Path "public/icons")) {
    New-Item -ItemType Directory -Path "public/icons" | Out-Null
    Write-Host "Created public/icons directory" -ForegroundColor Green
}

# Check if favicon exists and offer to copy it
if (Test-Path "public/favicon.png") {
    Write-Host "Found favicon.png - Would you like to copy it as placeholder icons? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        foreach ($size in $iconSizes) {
            Copy-Item "public/favicon.png" "public/icons/icon-${size}x${size}.png" -ErrorAction SilentlyContinue
        }
        Write-Host "Copied favicon.png to all icon sizes as placeholders" -ForegroundColor Green
    }
}
