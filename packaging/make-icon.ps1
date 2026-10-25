# Draw the app icon (256x256 PNG): water surface + fish + hook line
Add-Type -AssemblyName System.Drawing
$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# background: deep water gradient circle
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle(0, 0, $size, $size)),
  [System.Drawing.Color]::FromArgb(255, 30, 70, 90),
  [System.Drawing.Color]::FromArgb(255, 70, 140, 130),
  60)
$g.FillEllipse($bgBrush, 8, 8, 240, 240)

# water wave lines
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(140, 200, 230, 240), 3)
for ($i = 0; $i -lt 3; $i++) {
  $y = 60 + $i * 14
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddBezier(40, $y, 80, ($y - 10), 120, ($y + 10), 160, $y)
  $path.AddBezier(160, $y, 200, ($y - 10), 230, ($y + 10), 250, $y)
  $g.DrawPath($pen, $path)
  $path.Dispose()
}

# fish body (green-cyan) + tail + eye
$fishBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 120, 200, 170))
$g.FillEllipse($fishBrush, 80, 130, 110, 56)
$tail = New-Object System.Drawing.Drawing2D.GraphicsPath
$tail.AddPolygon(@(
  (New-Object System.Drawing.Point(80, 158)),
  (New-Object System.Drawing.Point(48, 132)),
  (New-Object System.Drawing.Point(58, 158)),
  (New-Object System.Drawing.Point(48, 184))
))
$g.FillPath($fishBrush, $tail)
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), 168, 148, 14, 14)
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)), 172, 151, 7, 7)

# fin
$finBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 80, 170, 150))
$fin = New-Object System.Drawing.Drawing2D.GraphicsPath
$fin.AddPolygon(@(
  (New-Object System.Drawing.Point(115, 133)),
  (New-Object System.Drawing.Point(135, 108)),
  (New-Object System.Drawing.Point(140, 133))
))
$g.FillPath($finBrush, $fin)

# fishing line + float (red-top float at surface)
$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 2)
$g.DrawLine($linePen, 200, 20, 200, 96)
$floatBrushR = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 220, 60, 50))
$floatBrushW = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.FillEllipse($floatBrushW, 192, 96, 16, 18)
$g.FillEllipse($floatBrushR, 192, 92, 16, 10)

$g.Dispose()
$out = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\fishing-game\packaging\jiangcheng-fisher.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output ('icon saved: ' + $out)
