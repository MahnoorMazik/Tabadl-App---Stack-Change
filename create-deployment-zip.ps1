# Creates deployment package for Tabadl Alkon CRM (new style - same as create-deployment-zip.sh)
# Output: tk-deployment.zip with top-level contents:
#   deploy.sh            <- run this on server
#   deployment/          <- app files (Dockerfile, src, prisma, etc.)
#
# On server: unzip tk-deployment.zip && ./deploy.sh

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = if ($env:PROJECT_ROOT) { $env:PROJECT_ROOT } else { $ScriptDir }
$ZipPath = Join-Path $ProjectRoot "tk-deployment.zip"
$TempDir = Join-Path $env:TEMP "ta-deployment-$PID"
$DeployRoot = $TempDir
$DeploymentFolder = Join-Path $DeployRoot "deployment"

$ExcludeRegex = '/node_modules/|/\.next/|/\.git/|\.(db|log|sqlite)$|/__pycache__/|\.pyc$|/uploads/'

function Copy-DirFiltered {
    param([string]$Src, [string]$Dest, [string]$ExtraExclude = '')
    $re = $ExcludeRegex
    if ($ExtraExclude) { $re = "$re|$ExtraExclude" }
    if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Path $Dest -Force | Out-Null }
    Get-ChildItem -Path $Src -Recurse -File -Force | ForEach-Object {
        $rel = $_.FullName.Substring($Src.Length + 1).Replace('\', '/')
        if ($rel -match $re) { return }
        $destPath = Join-Path $Dest $rel
        $parent = Split-Path $destPath -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -LiteralPath $_.FullName -Destination $destPath -Force
    }
}

Write-Host ""
Write-Host "Creating Tabadl Alkon CRM deployment package (new style: deploy.sh + deployment/)..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path $DeploymentFolder -Force | Out-Null
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

Set-Location $ProjectRoot

# Pre-flight
$RequiredFiles = @('Dockerfile', 'docker-compose.yml', 'docker-entrypoint.sh', 'package.json', 'deploy.sh')
foreach ($f in $RequiredFiles) {
    if (-not (Test-Path (Join-Path $ProjectRoot $f))) {
        Write-Host "ERROR: Required file not found: $f" -ForegroundColor Red
        exit 1
    }
}
if (-not (Test-Path (Join-Path $ProjectRoot "prisma/schema.prisma"))) {
    Write-Host "ERROR: prisma/schema.prisma not found" -ForegroundColor Red
    exit 1
}
Write-Host "All required files found" -ForegroundColor Green

# Type check (skip with $env:SKIP_TYPE_CHECK = "1")
if ($env:SKIP_TYPE_CHECK -ne "1") {
    Write-Host "Running TypeScript type check..."
    & pnpm run type-check 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Type check failed. Set SKIP_TYPE_CHECK=1 to skip." -ForegroundColor Red
        exit 1
    }
    Write-Host "  Type check passed" -ForegroundColor Green
}

# Prisma validate
Write-Host "Validating Prisma schema..."
& pnpm exec prisma validate 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Prisma schema invalid" -ForegroundColor Red
    exit 1
}
Write-Host "  Prisma schema valid" -ForegroundColor Green

# Optional build (skip with $env:SKIP_BUILD = "1")
if ($env:SKIP_BUILD -ne "1") {
    Write-Host "Running production build (verification only)..."
    if (Test-Path (Join-Path $ProjectRoot ".next")) {
        Remove-Item (Join-Path $ProjectRoot ".next") -Recurse -Force -ErrorAction SilentlyContinue
    }
    & pnpm run build 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed. Set SKIP_BUILD=1 to skip." -ForegroundColor Red
        exit 1
    }
    Write-Host "  Build passed" -ForegroundColor Green
}

# deploy.sh at root
Copy-Item -Path (Join-Path $ProjectRoot "deploy.sh") -Destination (Join-Path $DeployRoot "deploy.sh") -Force
Write-Host "Added: deploy.sh" -ForegroundColor Green

# Core files -> deployment/
$CoreFiles = @(
    'Dockerfile', 'docker-compose.yml', 'docker-entrypoint.sh', '.dockerignore',
    'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'next.config.ts', 'tailwind.config.ts',
    'postcss.config.mjs', 'eslint.config.mjs', 'components.json', 'server.ts', 'middleware.ts',
    'env.production.example', '.env.example', 'init-uploads.sh'
)
foreach ($f in $CoreFiles) {
    $fp = Join-Path $ProjectRoot $f
    if (Test-Path $fp) {
        Copy-Item -Path $fp -Destination (Join-Path $DeploymentFolder $f) -Force
        Write-Host "Added: deployment/$f" -ForegroundColor Green
    }
}

# Directories -> deployment/
$DirsToInclude = @('prisma', 'src', 'public', 'scripts')
foreach ($d in $DirsToInclude) {
    $dp = Join-Path $ProjectRoot $d
    if (Test-Path $dp) {
        $extra = if ($d -eq 'prisma') { '/db/' } else { '' }
        Copy-DirFiltered -Src $dp -Dest (Join-Path $DeploymentFolder $d) -ExtraExclude $extra
        Write-Host "Added directory: deployment/$d" -ForegroundColor Green
    }
}

# Create tk-deployment.zip with deploy.sh and deployment/ at top level
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
$zip = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    # deploy.sh at root of zip
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $DeployRoot "deploy.sh"), "deploy.sh") | Out-Null
    # deployment/ contents (each file as deployment/...)
    Get-ChildItem -Path $DeploymentFolder -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($DeploymentFolder.Length + 1).Replace('\', '/')
        $entryName = "deployment/" + $rel
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName) | Out-Null
    }
} finally { $zip.Dispose() }

Remove-Item $TempDir -Recurse -Force

Write-Host ""
Write-Host "Deployment package created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "File: $ZipPath"
if (Test-Path $ZipPath) {
    $sizeMB = (Get-Item $ZipPath).Length / 1MB
    Write-Host "Size: $([math]::Round($sizeMB, 2)) MB"
}
Write-Host ""
Write-Host "Contents: deploy.sh, deployment/"
Write-Host "On server: unzip tk-deployment.zip && ./deploy.sh"
Write-Host ""
