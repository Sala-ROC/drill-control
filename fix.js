const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The corrupted characters in the powershell output were:
//  (for í, ó, ñ) 
// ǭ (for á)
// Ǹ (for é)
// ǧ (for ú)
// ? (for missing chars)
// We will replace the full words instead of regex characters to be safe.

html = html.replace(/Automatizacin/g, 'Automatización')
           .replace(/Perforacin/g, 'Perforación')
           .replace(/Anlisis/g, 'Análisis')
           .replace(/Tcnico/g, 'Técnico')
           .replace(/Tcnicos/g, 'Técnicos')
           .replace(/Sesin/g, 'Sesión')
           .replace(/Versin/g, 'Versión')
           .replace(/Configuracin/g, 'Configuración')
           .replace(/Aadir/g, 'Añadir')
           .replace(/Diseo/g, 'Diseño')
           .replace(/Operacin/g, 'Operación')
           .replace(/Ejecucin/g, 'Ejecución')
           .replace(/Contrasea/g, 'Contraseña')
           .replace(/mǭs/g, 'más')
           .replace(/automǭticamente/g, 'automáticamente')
           .replace(/instantǭneamente/g, 'instantáneamente')
           .replace(/Ningǧn/g, 'Ningún')
           .replace(/cachǸ/g, 'caché')
           .replace(/\?"/g, '—') // The dash
           .replace(/\?/g, 'ñ'); 
           
fs.writeFileSync('index.html', html);
console.log("Fixed HTML");
