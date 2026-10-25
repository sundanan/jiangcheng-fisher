# Build the fish-image review DOCX (raw OOXML + Compress-Archive). ASCII script; data read as UTF8.
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\fishing-game'
$work = Join-Path $root '_docx_build'
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $work 'word\_rels') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $work 'word\media') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $work '_rels') | Out-Null

# ---- species data from fishData.js (id, name, latin, group) ----
$src = [IO.File]::ReadAllText((Join-Path $root 'src\fishData.js'), [Text.Encoding]::UTF8)
$entries = [regex]::Matches($src, "\{ id: '([a-z]+)', name: '([^']+)', latin: '([^']+)', group: '([A-Za-z]+)'")
$species = @()
foreach ($e in $entries) {
  $species += [pscustomobject]@{ id = $e.Groups[1].Value; name = $e.Groups[2].Value; latin = $e.Groups[3].Value; group = $e.Groups[4].Value }
}
# ---- groups (id, name) ----
$gEntries = [regex]::Matches($src, "\{ id: '([a-z]+)',\s*name: '([^']+)'")
$groups = @()
foreach ($g in $gEntries) { $groups += [pscustomobject]@{ id = $g.Groups[1].Value; name = $g.Groups[2].Value } }

# notes for disclosed fallbacks
$notes = @{
  'qingshao' = '同属替代图（红鳍原鲌，两 种外观近似）'
  'sibiao' = '同属线描插图（银飘鱼属）'
  'sheju' = '同科线描插图（长吻鮈，鮈类体形近似）'
  'xilin' = '同亚科鲴鱼照片（细鳞鲴全网无清晰图）'
  'yuanwen' = '同亚科鲴鱼照片（圆吻鲴全网无清晰图）'
  'changchunbian' = '同属替代图（团头鲂照片）'
  'douyu' = '同属替代图（叉尾斗鱼，圆尾斗鱼全网罕见照）'
  'dayan' = '鳜属照片（大眼鳜与翘嘴鳜外观近似）'
  'bangui' = '鳜属照片（斑鳜横纹不显著个体）'
  'daoyu' = '食材实景图（刀鱼肉姿）'
  'xinyu' = '标本线描图'
  'tongyu' = '教材线描图'
  'changwen' = '教材线描图'
  'yinpiao' = '教材线描图'
  'guanpiao' = '教材线描图'
  'daoqi' = '标本图'
  'dayinxinyu' = '标本图'
  'zibo' = '图偏暗（全网清晰图难寻）'
}

# ---- media copy + rels ----
$mediaDir = Join-Path $work 'word\media'
$relsBody = ''
$imgRid = @{}
$n = 0
foreach ($sp in $species) {
  $srcFile = Join-Path $root ('lib\photos_jpg\' + $sp.id + '.jpg')
  if (-not (Test-Path $srcFile)) { Write-Output ('MISSING ' + $sp.id); continue }
  $n++
  $mediaName = 'image' + $n + '.jpeg'
  Copy-Item $srcFile (Join-Path $mediaDir $mediaName) -Force
  $imgRid[$sp.id] = @{ rid = 'rIdImg' + $n; media = $mediaName }
  $relsBody += '<Relationship Id="rIdImg' + $n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + $mediaName + '"/>'
}

# ---- document.xml ----
$esc = { param($s) $s.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;') }

function ImgPara([string]$rid, [int]$idx) {
  $cx = 1980000  # 5.5 cm
  $cy = 1485000  # 4.125 cm
  return '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + $cx + '" cy="' + $cy + '"/><wp:docPr id="' + (100 + $idx) + '" name="img' + $idx + '"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + (100 + $idx) + '" name="img' + $idx + '"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + $rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + $cx + '" cy="' + $cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
}

$body = ''
$body += '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:rFonts w:eastAsia="Microsoft YaHei"/><w:b/><w:sz w:val="44"/><w:color w:val="1F3A5F"/></w:rPr><w:t>江城钓客 · 鱼图核查表</w:t></w:r></w:p>'
$body += '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="666666"/></w:rPr><w:t>共 67 种 · 供核对鱼名与图像是否一致（按类群分组）</w:t></w:r></w:p>'

$idx = 0
foreach ($g in $groups) {
  $list = $species | Where-Object { $_.group -eq $g.id }
  if (-not $list) { continue }
  $gicon = ''
  if ($g.id -eq 'bigFour') { $gicon = '四大家鱼' }
  $body += '<w:p><w:pPr><w:spacing w:before="240" w:after="120"/><w:shd w:val="clear" w:fill="E8F0F8"/></w:pPr><w:r><w:rPr><w:rFonts w:eastAsia="Microsoft YaHei"/><w:b/><w:sz w:val="28"/><w:color w:val="1F5FA8"/></w:rPr><w:t>' + (& $esc $g.name) + '</w:t></w:r></w:p>'
  foreach ($sp in $list) {
    if (-not $imgRid.ContainsKey($sp.id)) { continue }
    $idx++
    $nameTxt = & $esc $sp.name
    $latinTxt = & $esc $sp.latin
    $note = ''
    if ($notes.ContainsKey($sp.id)) { $note = '　⚠ ' + (& $esc $notes[$sp.id]) }
    $body += '<w:p><w:pPr><w:keepNext/><w:spacing w:before="160"/></w:pPr><w:r><w:rPr><w:rFonts w:eastAsia="Microsoft YaHei"/><w:b/><w:sz w:val="26"/></w:rPr><w:t>' + $idx.ToString() + '. ' + $nameTxt + '</w:t></w:r><w:r><w:rPr><w:i/><w:sz w:val="19"/><w:color w:val="888888"/></w:rPr><w:t xml:space="preserve">  ' + $latinTxt + '</w:t></w:r></w:p>'
    if ($note -ne '') {
      $body += '<w:p><w:pPr><w:keepNext/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="C07030"/></w:rPr><w:t>' + $note + '</w:t></w:r></w:p>'
    }
    $body += ImgPara $imgRid[$sp.id].rid $idx
  }
}
$body += '<w:p><w:pPr><w:spacing w:before="300"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr><w:t>注：标注 ⚠ 的条目为同属/同亚科近似图或特殊图源（该鱼种全网无可辨识照片），已如实披露；如获得准确照片，替换 fishing-game/lib/photos/ 下同名文件即可。</w:t></w:r></w:p>'

$docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>' + $body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>'
[IO.File]::WriteAllText((Join-Path $work 'word\document.xml'), $docXml, (New-Object System.Text.UTF8Encoding($false)))

# ---- rels / content types ----
$docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>' + $relsBody + '</Relationships>'
[IO.File]::WriteAllText((Join-Path $work 'word\_rels\document.xml.rels'), $docRels, (New-Object System.Text.UTF8Encoding($false)))

$styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Microsoft YaHei" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>'
[IO.File]::WriteAllText((Join-Path $work 'word\styles.xml'), $styles, (New-Object System.Text.UTF8Encoding($false)))
$fontTable = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'
[IO.File]::WriteAllText((Join-Path $work 'word\fontTable.xml'), $fontTable, (New-Object System.Text.UTF8Encoding($false)))

$ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/></Types>'
[IO.File]::WriteAllText((Join-Path $work '[Content_Types].xml'), $ct, (New-Object System.Text.UTF8Encoding($false)))
$relsRoot = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
[IO.File]::WriteAllText((Join-Path $work '_rels\.rels'), $relsRoot, (New-Object System.Text.UTF8Encoding($false)))

# ---- zip ----
$docxPath = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\鱼图核查表.docx'
if (Test-Path $docxPath) { Remove-Item $docxPath -Force }
# Compress-Archive uses backslash paths in entries which Word dislikes; build zip via .NET with forward slashes
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($docxPath, 'Create')
$files = Get-ChildItem $work -Recurse -File
foreach ($f in $files) {
  $rel = $f.FullName.Substring($work.Length + 1).Replace('\', '/')
  $entry = $zip.CreateEntry($rel)
  $bytes = [IO.File]::ReadAllBytes($f.FullName)
  $es = $entry.Open(); $es.Write($bytes, 0, $bytes.Length); $es.Close()
}
$zip.Dispose()
Write-Output ('docx built: ' + $docxPath + '  images: ' + $n)
