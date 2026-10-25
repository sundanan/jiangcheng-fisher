# Download real fish photos into lib/photos/ (source: Wikipedia; needs network access to wikipedia)
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File fetch-photos.ps1
# After download the game uses local real photos (offline OK); missing species fall back to 3D snapshots.
$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\fishing-game'
$outDir = Join-Path $root 'lib\photos'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$src = Get-Content (Join-Path $root 'src\fishData.js') -Raw
$entries = [regex]::Matches($src, "\{ id: '([^']+)', name: '([^']+)', latin: '([^']+)'")
$ok = 0; $fail = @()
foreach ($e in $entries) {
  $id = $e.Groups[1].Value
  $name = $e.Groups[2].Value -replace '\uff08.*?\uff09', ''
  $latin = ($e.Groups[3].Value -replace ' ', '_')
  $out = Join-Path $outDir "$id.jpg"
  if (Test-Path $out) { $ok++; continue }
  $url = $null
  $apis = @("https://zh.wikipedia.org/api/rest_v1/page/summary/$name", "https://en.wikipedia.org/api/rest_v1/page/summary/$latin")
  foreach ($api in $apis) {
    try {
      $enc = [uri]::EscapeUriString($api)
      $j = Invoke-RestMethod -Uri $enc -TimeoutSec 12
      if ($j.originalimage.source) { $url = $j.originalimage.source; break }
      if ($j.thumbnail.source) { $url = $j.thumbnail.source; break }
    } catch {}
  }
  if ($url) {
    try {
      Invoke-WebRequest -Uri ([uri]::EscapeUriString($url)) -OutFile $out -TimeoutSec 20
      if ((Get-Item $out).Length -gt 5000) { $ok++; Write-Host "OK  $id ($name)" } else { Remove-Item $out; $fail += $id }
    } catch { $fail += $id }
  } else { $fail += $id }
  Start-Sleep -Milliseconds 300
}
Write-Host ""
Write-Host "Done: $ok / $($entries.Count)"
if ($fail.Count) { Write-Host ('Missing (will use 3D snapshot): ' + ($fail -join ', ')) }
