$txt = Get-Content -Path 'C:\Users\ASUS\.gemini\antigravity\scratch\control-solicitudes\app_v2.js' -Raw -Encoding UTF8
$txt = [Text.RegularExpressions.Regex]::Replace($txt, '\bat.*?micamente\b', 'atómicamente')
$txt = [Text.RegularExpressions.Regex]::Replace($txt, '\bAt.*?m[^\s\w]+', 'Atómico')
$txt = [Text.RegularExpressions.Regex]::Replace($txt, '\bt.*?cunico[Ss]\b', 'técnicos')
$txt = [Text.RegularExpressions.Regex]::Replace($txt, 'ǟ.*?z\b', 'ÉXITO')
$txt = [Text.RegularExpressions.Regex]::Replace($txt, 'ǟ.*?\?', 'ÉXITO')
Set-Content -Path 'C:\Users\ASUS\.gemini\antigravity\scratch\control-solicitudes\app_v2.js' -Value $txt -Encoding UTF8

$txt2 = Get-Content -Path 'C:\Users\ASUS\.gemini\antigravity\scratch\control-solicitudes\index.html' -Raw -Encoding UTF8
$txt2 = [Text.RegularExpressions.Regex]::Replace($txt2, '\bsesi.*?n\b', 'sesión')
$txt2 = [Text.RegularExpressions.Regex]::Replace($txt2, '\bDescripci.*?n\b', 'Descripción')
$txt2 = [Text.RegularExpressions.Regex]::Replace($txt2, '\bConfiguraci.*?n\b', 'Configuración')
$txt2 = [Text.RegularExpressions.Regex]::Replace($txt2, '\banimaci.*?n\b', 'animación')
$txt2 = [Text.RegularExpressions.Regex]::Replace($txt2, '\bubicaci.*?n\b', 'ubicación')
$txt2 = [Text.RegularExpressions.Regex]::Replace($txt2, '\bInici.*?n\b', 'Inicia')
$txt2 = [Text.RegularExpressions.Regex]::Replace($txt2, '\bGESTI.*?N\b', 'GESTIÓN')
Set-Content -Path 'C:\Users\ASUS\.gemini\antigravity\scratch\control-solicitudes\index.html' -Value $txt2 -Encoding UTF8
