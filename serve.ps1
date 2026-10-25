# Simple static file server (ASCII only, PowerShell 5.1 safe)
$root = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\fishing-game'
$errlog = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\fishing-game\serve-errors.log'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://127.0.0.1:8137/')
$listener.Start()
Write-Output "Serving [$root] at http://127.0.0.1:8137/"
$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
}
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    # POST /api/save : save base64 dataURL images OR text files (name may use __ as path separator)
    if ($ctx.Request.HttpMethod -eq 'POST' -and $ctx.Request.Url.AbsolutePath -eq '/api/save') {
      $body = (New-Object IO.StreamReader($ctx.Request.InputStream, [Text.Encoding]::UTF8)).ReadToEnd()
      $j = $body | ConvertFrom-Json
      $rel = ''
      if ($j.PSObject.Properties.Name -contains 'text') {
        # text mode: name is relative path with __ as separator
        $rel = ($j.name -replace '__', '/') -replace '\.\.', ''
        $outFile = Join-Path $root $rel
        if (-not $outFile.StartsWith($root)) { throw 'path escape' }
        New-Item -ItemType Directory -Force -Path (Split-Path $outFile) | Out-Null
        [IO.File]::WriteAllText($outFile, $j.text, (New-Object System.Text.UTF8Encoding($false)))
        $ctx.Response.StatusCode = 200
        $ok = [Text.Encoding]::UTF8.GetBytes('saved-text')
        $ctx.Response.OutputStream.Write($ok, 0, $ok.Length)
        continue
      }
      $safeName = ($j.name -replace '[^A-Za-z0-9_\-]', '')
      $outDir = Join-Path $root 'lib\photos_jpg'
      if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
      $b64 = $j.data -replace '^data:image/\w+;base64,', ''
      [IO.File]::WriteAllBytes((Join-Path $outDir ($safeName + '.jpg')), [Convert]::FromBase64String($b64))
      $ctx.Response.StatusCode = 200
      $ok = [Text.Encoding]::UTF8.GetBytes('saved')
      $ctx.Response.OutputStream.Write($ok, 0, $ok.Length)
      continue
    }
    $p = $ctx.Request.Url.AbsolutePath
    if ($p -eq '/') { $p = '/index.html' }
    $p = $p -replace '\.\.', ''
    $file = Join-Path $root ($p -replace '/', '\')
    $ok = (Test-Path $file -PathType Leaf) -and ($file.StartsWith($root))
    $ctx.Response.Headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    $ctx.Response.Headers['Pragma'] = 'no-cache'
    $ctx.Response.Headers['Expires'] = '-1'
    if ($ok) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] } else { $ctx.Response.ContentType = 'application/octet-stream' }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $b = [Text.Encoding]::UTF8.GetBytes('404 ' + $p)
      $ctx.Response.OutputStream.Write($b, 0, $b.Length)
    }
  } catch {
    Add-Content -Path $errlog -Value ("ERR: " + $_.Exception.ToString())
    try { $ctx.Response.StatusCode = 500 } catch {}
  } finally {
    try { $ctx.Response.OutputStream.Close() } catch {}
  }
}
