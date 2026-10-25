# Build UOS/Debian .deb package for jiangcheng-fisher (ASCII script, BOM not required)
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\fishing-game'
$pkg = 'jiangcheng-fisher'
$ver = '1.0.0'
$stage = Join-Path $root '_deb_stage'
$ctrl = Join-Path $root '_deb_ctrl'
$outDir = Join-Path $root 'dist'
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
if (Test-Path $ctrl) { Remove-Item $ctrl -Recurse -Force }
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }

# ---- data tree ----
$opt = Join-Path $stage 'opt\jiangcheng-fisher'
New-Item -ItemType Directory -Force -Path $opt | Out-Null
# game runtime files only
Copy-Item (Join-Path $root 'index.html') $opt
Copy-Item (Join-Path $root 'README.md') $opt
New-Item -ItemType Directory -Force -Path (Join-Path $opt 'src') | Out-Null
Copy-Item (Join-Path $root 'src\*.js') (Join-Path $opt 'src')
New-Item -ItemType Directory -Force -Path (Join-Path $opt 'lib\photos') | Out-Null
Copy-Item (Join-Path $root 'lib\three.module.js') (Join-Path $opt 'lib')
Copy-Item (Join-Path $root 'lib\leaflet.js') (Join-Path $opt 'lib') -ErrorAction SilentlyContinue
Copy-Item (Join-Path $root 'lib\leaflet.css') (Join-Path $opt 'lib') -ErrorAction SilentlyContinue
Copy-Item (Join-Path $root 'lib\photos\*.jpg') (Join-Path $opt 'lib\photos')
# launcher + icon + desktop
Copy-Item (Join-Path $root 'packaging\launch.sh') $opt
$appDir = Join-Path $stage 'usr\share\applications'
$icoDir = Join-Path $stage 'usr\share\icons\hicolor\256x256\apps'
New-Item -ItemType Directory -Force -Path $appDir, $icoDir | Out-Null
Copy-Item (Join-Path $root 'packaging\jiangcheng-fisher.desktop') $appDir
Copy-Item (Join-Path $root 'packaging\jiangcheng-fisher.png') $icoDir

# ---- control tree ----
New-Item -ItemType Directory -Force -Path $ctrl | Out-Null
Copy-Item (Join-Path $root 'packaging\control') $ctrl
Copy-Item (Join-Path $root 'packaging\postinst') $ctrl
Copy-Item (Join-Path $root 'packaging\prerm') $ctrl

# ---- tarballs (GNU tar style: root ownership) ----
$tarExe = 'C:\Windows\System32\tar.exe'
$dataTgz = Join-Path $outDir 'data.tar.gz'
$ctrlTgz = Join-Path $outDir 'control.tar.gz'
if (Test-Path $dataTgz) { Remove-Item $dataTgz -Force }
if (Test-Path $ctrlTgz) { Remove-Item $ctrlTgz -Force }
& $tarExe -czf $dataTgz --format=ustar --uid 0 --gid 0 --uname root --gname root -C $stage .
& $tarExe -czf $ctrlTgz --format=ustar --uid 0 --gid 0 --uname root --gname root -C $ctrl .
Write-Output ('data.tar.gz: ' + (Get-Item $dataTgz).Length + ' B')
Write-Output ('control.tar.gz: ' + (Get-Item $ctrlTgz).Length + ' B')

# ---- ar archive (.deb) ----
# ar member: name(16) mtime(12) uid(6) gid(6) mode(8) size(10) magic(2 = backtick LF), data padded to even
function Emit-ArMember([System.IO.BinaryWriter]$bw, [string]$name, [string]$filePath) {
  $bytes = [IO.File]::ReadAllBytes($filePath)
  $n = $name.PadRight(16).Substring(0, 16)
  $bw.Write([Text.Encoding]::ASCII.GetBytes($n))
  $bw.Write([Text.Encoding]::ASCII.GetBytes('0'.PadLeft(12).Substring(0, 12)))          # mtime
  $bw.Write([Text.Encoding]::ASCII.GetBytes('0'.PadLeft(6).Substring(0, 6)))            # uid
  $bw.Write([Text.Encoding]::ASCII.GetBytes('0'.PadLeft(6).Substring(0, 6)))            # gid
  $mode = if ($name -eq 'control.tar.gz/' -or $name -eq 'data.tar.gz/') { '100644' } else { '100644' }
  $bw.Write([Text.Encoding]::ASCII.GetBytes($mode.PadRight(8).Substring(0, 8)))
  $bw.Write([Text.Encoding]::ASCII.GetBytes((([string]$bytes.Length).PadLeft(10)).Substring(0, 10)))
  $bw.Write([byte]0x60); $bw.Write([byte]0x0A)
  $bw.Write($bytes)
  if ($bytes.Length % 2 -eq 1) { $bw.Write([byte]0x0A) }
}

$debPath = Join-Path $outDir ("$pkg" + '_' + "$ver" + '_all.deb')
if (Test-Path $debPath) { Remove-Item $debPath -Force }
$binFile = Join-Path $outDir '_debian-binary'
[IO.File]::WriteAllText($binFile, "2.0`n", [Text.Encoding]::ASCII)
$fs = [IO.File]::Create($debPath)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([Text.Encoding]::ASCII.GetBytes('!<arch>' + [char]10))
Emit-ArMember $bw 'debian-binary/' $binFile
Emit-ArMember $bw 'control.tar.gz/' $ctrlTgz
Emit-ArMember $bw 'data.tar.gz/' $dataTgz
$bw.Close(); $fs.Close()
Remove-Item $binFile -Force
Remove-Item $stage -Recurse -Force
Remove-Item $ctrl -Recurse -Force
Write-Output ('DEB built: ' + $debPath + '  (' + [math]::Round((Get-Item $debPath).Length / 1MB, 2) + ' MB)')
