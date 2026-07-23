# Generate secrets for production (Windows counterpart of scripts/generate-secrets.sh)
# Usage: .\scripts\generate-secrets.ps1

Write-Host "======================================="
Write-Host "Generating Production Secrets"
Write-Host "======================================="
Write-Host ""

# Generate NEXTAUTH_SECRET (32+ bytes, base64 – same as openssl rand -base64 32)
$bytes32 = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes32)
$nextAuthSecret = [Convert]::ToBase64String($bytes32)
Write-Host "NEXTAUTH_SECRET:"
Write-Host $nextAuthSecret
Write-Host ""

# Generate JWT_SECRET (48+ bytes, base64 – same as openssl rand -base64 48)
$bytes48 = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes48)
$jwtSecret = [Convert]::ToBase64String($bytes48)
Write-Host "JWT_SECRET:"
Write-Host $jwtSecret
Write-Host ""

# Generate VAPID keys
Write-Host "Generating VAPID keys..."
pnpm exec web-push generate-vapid-keys
Write-Host ""

Write-Host "======================================="
Write-Host "Copy these values to your .env file"
Write-Host "======================================="
