# Proxync One-Line Installer for Windows
# Usage:
#   irm https://proxync.dev/install.ps1 | iex
#   & { irm https://proxync.dev/install.ps1 } -Gui
param(
    [switch]$Gui,
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$Repo = "Inilax/Proxync"

Write-Host "==> Installing Proxync for Windows (x64)..." -ForegroundColor Cyan

# Auto-resolve latest release version if not explicitly passed
if (-not $Version) {
    try {
        $Latest = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -UseBasicParsing -TimeoutSec 4
        if ($Latest -and $Latest.tag_name) {
            $Version = $Latest.tag_name
        }
    } catch {
        try {
            $LatestJson = Invoke-RestMethod -Uri "https://github.com/$Repo/releases/latest/download/latest.json" -UseBasicParsing -TimeoutSec 4
            if ($LatestJson -and $LatestJson.version) {
                $Version = if ($LatestJson.version.StartsWith('v')) { $LatestJson.version } else { "v$($LatestJson.version)" }
            }
        } catch {}
    }
}

$InstallDir = "$env:LOCALAPPDATA\Programs\Proxync\bin"
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
}

$ExeUrl = if ($Version) {
    "https://github.com/$Repo/releases/download/$Version/proxync-windows-x86_64.exe"
} else {
    "https://github.com/$Repo/releases/latest/download/proxync-windows-x86_64.exe"
}
$TargetPath = Join-Path $InstallDir "proxync.exe"

# Resolve possible local build locations
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$RepoRoot = if ($ScriptDir) { Split-Path -Parent $ScriptDir } else { (Get-Location).Path }
$LocalBin = Join-Path $RepoRoot "packages\cli\target\release\proxync.exe"
$LocalDebug = Join-Path $RepoRoot "packages\cli\target\debug\proxync.exe"

$Installed = $false

Write-Host "==> Fetching Proxync CLI ($Version)..."
try {
    Invoke-WebRequest -Uri $ExeUrl -OutFile $TargetPath -UseBasicParsing
    Write-Host "[OK] Downloaded release binary from GitHub" -ForegroundColor Green
    $Installed = $true
} catch {
    # If GitHub download fails (pre-release or rate-limited), look for local build
    if (Test-Path $LocalBin) {
        Copy-Item -Path $LocalBin -Destination $TargetPath -Force
        Write-Host "[OK] Installed from local release build: $LocalBin" -ForegroundColor Green
        $Installed = $true
    } elseif (Test-Path $LocalDebug) {
        Copy-Item -Path $LocalDebug -Destination $TargetPath -Force
        Write-Host "[OK] Installed from local debug build: $LocalDebug" -ForegroundColor Green
        $Installed = $true
    } else {
        $CargoToml = Join-Path $RepoRoot "packages\cli\Cargo.toml"
        if (Test-Path $CargoToml) {
            Write-Host "[*] Building locally via cargo..." -ForegroundColor Yellow
            cargo build --release --manifest-path="$CargoToml"
            if (Test-Path $LocalBin) {
                Copy-Item -Path $LocalBin -Destination $TargetPath -Force
                Write-Host "[OK] Built and installed release binary" -ForegroundColor Green
                $Installed = $true
            }
        }
    }
}

if (-not $Installed) {
    Write-Error "Could not install Proxync CLI. Neither remote release nor local binary was found."
    exit 1
}

# Add to User PATH if not already present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    $NewUserPath = if ([string]::IsNullOrEmpty($UserPath)) { $InstallDir } else { "$UserPath;$InstallDir" }
    [Environment]::SetEnvironmentVariable("Path", $NewUserPath, "User")
    $env:Path = "$env:Path;$InstallDir"
    Write-Host "[OK] Added $InstallDir to User PATH" -ForegroundColor Green
} else {
    Write-Host "[OK] $InstallDir is already in User PATH" -ForegroundColor Green
}

Write-Host "[OK] Proxync CLI installed to $TargetPath" -ForegroundColor Green

# Install Desktop GUI if requested
if ($Gui) {
    Write-Host "==> Fetching Proxync Desktop GUI Installer..." -ForegroundColor Cyan
    $VerNum = if ($Version) { $Version.TrimStart('v') } else { "" }
    $GuiInstallerUrl = if ($Version -and $VerNum) {
        "https://github.com/$Repo/releases/download/$Version/Proxync_${VerNum}_x64-setup.exe"
    } else {
        "https://github.com/$Repo/releases/latest/download/Proxync_x64-setup.exe"
    }
    $TempInstaller = Join-Path $env:TEMP "proxync-gui-setup.exe"
    try {
        Invoke-WebRequest -Uri $GuiInstallerUrl -OutFile $TempInstaller -UseBasicParsing
        Write-Host "==> Launching Desktop Installer..." -ForegroundColor Cyan
        Start-Process -FilePath $TempInstaller -Wait
        Write-Host "[OK] Proxync Desktop GUI installed" -ForegroundColor Green
    } catch {
        Write-Host "[!] Desktop installer not yet available from GitHub releases." -ForegroundColor Yellow
        Write-Host "    You can launch GUI via dev mode: npm run dev"
    }
}

Write-Host "`nAll set! Open a new PowerShell terminal and run:" -ForegroundColor Green
Write-Host "  proxync doctor" -ForegroundColor Yellow
Write-Host "  proxync scan" -ForegroundColor Yellow
Write-Host "  proxync tunnel 3000" -ForegroundColor Yellow
