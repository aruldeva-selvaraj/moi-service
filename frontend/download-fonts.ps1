# ──────────────────────────────────────────────────────────────
# Moify - Offline Font Downloader
# Downloads all required fonts into src\assets\fonts
# Usage:
#   cd moi-wedding-app\frontend
#   powershell -ExecutionPolicy Bypass -File .\download-fonts.ps1
# ──────────────────────────────────────────────────────────────

if ($PSScriptRoot) {
    $basePath = $PSScriptRoot
}
else {
    $basePath = (Get-Location).Path
}

$dest = Join-Path $basePath "src\assets\fonts"

New-Item -ItemType Directory -Force -Path $dest | Out-Null

$headers = @{
    "User-Agent" = "Mozilla/5.0"
}

function Download-Font {
    param(
        [string]$Url,
        [string]$FileName
    )

    $output = Join-Path $dest $FileName

    if (Test-Path $output) {
        Write-Host "[SKIP] $FileName already exists."
        return
    }

    try {
        Invoke-WebRequest `
            -Uri $Url `
            -Headers $headers `
            -OutFile $output `
            -TimeoutSec 60

        Write-Host "[ OK ] $FileName"
    }
    catch {
        Write-Host "[FAIL] $FileName"
        Write-Host $_.Exception.Message
    }
}

Write-Host ""
Write-Host "Downloading Material Icons..."

Download-Font `
"https://github.com/google/material-design-icons/raw/master/font/MaterialIcons-Regular.woff2" `
"MaterialIcons-Regular.woff2"

Download-Font `
"https://github.com/google/material-design-icons/raw/master/font/MaterialIcons-Regular.woff" `
"MaterialIcons-Regular.woff"

Write-Host ""
Write-Host "Downloading Inter Fonts..."

Download-Font `
"https://rsms.me/inter/font-files/Inter-Light.woff2" `
"Inter-300.woff2"

Download-Font `
"https://rsms.me/inter/font-files/Inter-Regular.woff2" `
"Inter-400.woff2"

Download-Font `
"https://rsms.me/inter/font-files/Inter-Medium.woff2" `
"Inter-500.woff2"

Download-Font `
"https://rsms.me/inter/font-files/Inter-SemiBold.woff2" `
"Inter-600.woff2"

Write-Host ""
Write-Host "Downloading Playfair Display..."

Download-Font `
"https://cdn.jsdelivr.net/npm/@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2" `
"PlayfairDisplay-Regular.woff2"

Download-Font `
"https://cdn.jsdelivr.net/npm/@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff2" `
"PlayfairDisplay-SemiBold.woff2"

Download-Font `
"https://cdn.jsdelivr.net/npm/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2" `
"PlayfairDisplay-Bold.woff2"

Write-Host ""
Write-Host "Downloading Noto Sans Tamil..."

Download-Font `
"https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-400-normal.woff2" `
"NotoSansTamil-Regular.woff2"

Write-Host ""
Write-Host "===================================="
Write-Host "All downloads completed."
Write-Host "Fonts saved to:"
Write-Host $dest
Write-Host "===================================="