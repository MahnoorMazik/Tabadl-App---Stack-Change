# Windows entry point for Tabadl Alkon CRM deployment package
# Output: tk-deployment.zip with deploy.sh + deployment/
#
# Usage:
#   .\create-deployment.ps1
#
# Optional env vars:
#   $env:SKIP_TYPE_CHECK = "1"
#   $env:SKIP_BUILD = "1"

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ZipScript = Join-Path $ScriptDir "create-deployment-zip.ps1"

if (-not (Test-Path $ZipScript)) {
    Write-Host "ERROR: Missing script: $ZipScript" -ForegroundColor Red
    exit 1
}

# Child .ps1 files are blocked under default ExecutionPolicy — bypass for this run only
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ZipScript @args
exit $LASTEXITCODE
