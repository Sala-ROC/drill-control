$file = "c:\Users\ASUS\.gemini\antigravity\scratch\control-solicitudes\index.html"
$content = Get-Content $file -Raw
$content = $content -replace 'v3\.6\.2', 'v3.6.3'
Set-Content -Path $file -Value $content

$reportes = "c:\Users\ASUS\.gemini\antigravity\scratch\control-solicitudes\reportes.js"
if (Test-Path $reportes) {
    $rContent = Get-Content $reportes -Raw
    $rContent = $rContent -replace 'v3\.6\.2', 'v3.6.3'
    Set-Content -Path $reportes -Value $rContent
}

$desktop = [Environment]::GetFolderPath("Desktop")
$zipPath = Join-Path $desktop "control-solicitudes_v3.6.3_backup.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "c:\Users\ASUS\.gemini\antigravity\scratch\control-solicitudes\*" -DestinationPath $zipPath -Force
Write-Output "Backup creado en: $zipPath"
