# Bump to v16
$dir = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\fishing-game\src'
$old = '?v=14'
$new = '?v=16'
Get-ChildItem (Join-Path $dir '*.js') | ForEach-Object {
  $c = [IO.File]::ReadAllText($_.FullName)
  $c2 = $c.Replace($old, $new)
  if ($c2 -ne $c) { [IO.File]::WriteAllText($_.FullName, $c2); Write-Output ('bumped ' + $_.Name) }
}
$h = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\fishing-game\index.html'
$c = [IO.File]::ReadAllText($h)
$c = $c -replace 'main\.js\?v=\d+', ('main.js' + $new)
[IO.File]::WriteAllText($h, $c)
Write-Output 'index bumped to v16'
