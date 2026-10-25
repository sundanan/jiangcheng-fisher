# Download real fish photos from Bing image search (China reachable) into lib/photos/
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File fetch-photos-bing.ps1
$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\fishing-game'
$outDir = Join-Path $root 'lib\photos'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

$src = Get-Content (Join-Path $root 'src\fishData.js') -Raw -Encoding UTF8
$entries = [regex]::Matches($src, "id: '([^']+)', name: '([^']+)', latin: '([^']+)'")
$ok = 0; $fail = @()
foreach ($e in $entries) {
  $id = $e.Groups[1].Value
  $name = $e.Groups[2].Value -replace '\uff08.*?\uff09', ''
  $out = Join-Path $outDir "$id.jpg"
  if ((Test-Path $out) -and ((Get-Item $out).Length -gt 3000)) { $ok++; continue }
  $q = [uri]::EscapeDataString("$name 鱼类")
  $html = ''
  try { $html = (Invoke-WebRequest -Uri "https://cn.bing.com/images/search?q=$q" -UserAgent $UA -TimeoutSec 15).Content } catch {}
  $m = [regex]::Matches($html, 'https://tse[0-9]-mm\.cn\.bing\.net/th/id/[A-Za-z0-9.\-_?=&;]+')
  $got = $false
  # try up to first 3 thumbnails until one downloads as a valid image
  for ($i = 0; $i -lt [Math]::Min(3, $m.Count); $i++) {
    $u = $m[$i].Value
    if ($u -notmatch 'w=') { $u = $u + '&w=520' } else { $u = $u -replace 'w=\d+', 'w=520' }
    try {
      Invoke-WebRequest -Uri $u -UserAgent $UA -OutFile $out -TimeoutSec 15
      $len = (Get-Item $out).Length
      if ($len -gt 3000) {
        $bytes = [System.IO.File]::ReadAllBytes($out)
        $magic = [System.Text.Encoding]::ASCII.GetString($bytes[0..3])
        if ($magic -eq 'RIFF' -or $bytes[0] -eq 0xFF -or $magic -eq 'PNG ') { $got = $true; break }
      }
    } catch {}
    Remove-Item $out -ErrorAction SilentlyContinue
  }
  if ($got) { $ok++; Write-Host "OK  $id ($name)" } else { $fail += $id }
  Start-Sleep -Milliseconds 350
}
Write-Host ""
Write-Host "Done: $ok / $($entries.Count)"
if ($fail.Count) { Write-Host ('Missing (3D snapshot fallback): ' + ($fail -join ', ')) }
