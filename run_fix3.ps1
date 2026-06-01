$txt = Get-Content -Path 'C:\Users\ASUS\.gemini\antigravity\scratch\control-solicitudes\app_v2.js' -Raw -Encoding UTF8
$txt = [Text.RegularExpressions.Regex]::Replace($txt, 'Atǟ.*?m', 'Atóm')
$txt = [Text.RegularExpressions.Regex]::Replace($txt, 'ǟ.*?z\b', 'ÉXITO')
$txt = [Text.RegularExpressions.Regex]::Replace($txt, 'ǟ.*?\?', 'ÉXITO')
Set-Content -Path 'C:\Users\ASUS\.gemini\antigravity\scratch\control-solicitudes\app_v2.js' -Value $txt -Encoding UTF8
