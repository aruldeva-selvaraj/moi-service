# ─────────────────────────────────────────────────────────────────────────────
# Moify — One-time font downloader
# Run this script ONCE (from home internet, hotspot, or any unblocked machine)
# to populate src\assets\fonts\ with all required font files.
# After running, the app works completely offline — no CDN requests at all.
#
# Usage:
#   cd moi-wedding-app\frontend
#   .\download-fonts.ps1
# ─────────────────────────────────────────────────────────────────────────────

$dest = Join-Path $PSScriptRoot "src\assets\fonts"
New-Item -ItemType Directory -Force $dest | Out-Null
$h = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }

function Download($url, $file) {
    $out = Join-Path $dest $file
    if (Test-Path $out) { Write-Host "  SKIP  $file (already exists)"; return }
    try {
        Invoke-WebRequest -Uri $url -OutFile $out -Headers $h -UseBasicParsing -TimeoutSec 60
        Write-Host "  OK    $file"
    } catch {
        Write-Warning "FAILED $file — $_"
    }
}

Write-Host "`nDownloading Material Icons font..."
Download "https://github.com/google/material-design-icons/raw/master/font/MaterialIcons-Regular.woff2" "MaterialIcons-Regular.woff2"
Download "https://github.com/google/material-design-icons/raw/master/font/MaterialIcons-Regular.woff"  "MaterialIcons-Regular.woff"

Write-Host "`nDownloading Inter font (body / UI text)..."
# Inter v4 — Latin subset, variable font slices per weight
$interBase = "https://fonts.gstatic.com/s/inter/v13"
# These URLs match the Latin-subset woff2 for weights 300/400/500/600
Download "https://rsms.me/inter/font-files/Inter-Light.woff2"    "Inter-300.woff2"
Download "https://rsms.me/inter/font-files/Inter-Regular.woff2"  "Inter-400.woff2"
Download "https://rsms.me/inter/font-files/Inter-Medium.woff2"   "Inter-500.woff2"
Download "https://rsms.me/inter/font-files/Inter-SemiBold.woff2" "Inter-600.woff2"

Write-Host "`nDownloading Playfair Display font (headings / logo)..."
$playfairBase = "https://github.com/clauseggers/Playfair/raw/master/fonts/ttf"
# Prefer woff2 from fontsource CDN (unpkg mirrors the npm package)
Download "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5/files/playfair-display-latin-400-normal.woff2" "PlayfairDisplay-Regular.woff2"
Download "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5/files/playfair-display-latin-600-normal.woff2" "PlayfairDisplay-SemiBold.woff2"
Download "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5/files/playfair-display-latin-700-normal.woff2" "PlayfairDisplay-Bold.woff2"

Write-Host "`nDownloading Noto Sans Tamil (used in printed receipts)..."
Download "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-tamil@5/files/noto-sans-tamil-tamil-400-normal.woff2" "NotoSansTamil-Regular.woff2"

Write-Host "`nDone! Files saved to: $dest"
Write-Host "Restart 'npm start' to serve the updated fonts."
