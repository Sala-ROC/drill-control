$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Servidor escuchando en http://localhost:8080"
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $response = $context.Response
        $path = $context.Request.Url.LocalPath.Replace("/", "\")
        if ($path -eq "\") { $path = "\index.html" }
        $file = "C:\Users\ASUS\.gemini\antigravity\scratch\control-solicitudes" + $path
        
        if (Test-Path $file) {
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                default { $response.ContentType = "application/octet-stream" }
            }
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
