# 推送 jiangcheng-fisher 到 GitHub（需要你的 GitHub 账号授权）
# 用法：
#   1) 打开 https://github.com/new 登录并创建仓库 jiangcheng-fisher（不要勾选 README/LICENSE/.gitignore）
#   2) 在 https://github.com/settings/tokens 创建 Personal Access Token（勾选 repo 权限）
#   3) 运行本脚本，按提示输入用户名和 token（token 作为密码，输入时粘贴即可）
#      powershell -NoProfile -ExecutionPolicy Bypass -File push-github.ps1

$git = 'C:\Users\pc\.zcode\tools\mingit\cmd\git.exe'
$repo = 'C:\Users\pc\.zcode\workspace\97683873-dc03-4044-93a0-00ad123b5385\fishing-game'

$user = Read-Host 'GitHub 用户名'
$token = Read-Host 'GitHub Personal Access Token (粘贴)'

Set-Location $repo
& $git remote remove origin 2>$null
& $git remote add origin "https://${user}:${token}@github.com/${user}/jiangcheng-fisher.git"
& $git push -u origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host ''
  Write-Host "推送成功！仓库地址： https://github.com/$user/jiangcheng-fisher" -ForegroundColor Green
  # 清理含 token 的 remote url（安全）
  & $git remote set-url origin "https://github.com/$user/jiangcheng-fisher.git"
  & $git config credential.helper store
  Write-Host '已保存凭据（~/.git-credentials），下次推送免输 token'
} else {
  Write-Host '推送失败：请检查用户名/token/仓库名（仓库需先在 GitHub 网页上创建）' -ForegroundColor Red
}
