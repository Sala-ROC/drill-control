const fs = require('fs');
const files = ['app_v2.js', 'index.html'];

const dict = {
  // Common fixes
  'sesiǟ''Ń?Tǟ?s''n': 'sesión',
  'Crǟ''Ń?Tǟ?s''tico': 'Crítico',
  'tǟ''Ń?Tǟ?s''cunico': 'técnico',
  'tǟ''Ń?Tǟ?s''cnica': 'técnica',
  'ediciǟ''Ń?Tǟ?s''n': 'edición',
  'Actualizaciǟ''Ń?Tǟ?s''n': 'Actualización',
  'atǟ''Ń?Tǟ?s''mica': 'atómica',
  'atǟ''Ń?Tǟ?s''micamente': 'atómicamente',
  'mǟ''Ń?Tǟ?s''s': 'más',
  'Funciǟ''Ń?Tǟ?s''n': 'Función',
  'rǟ''Ń?Tǟ?s''pido': 'rápido',
  'bǟ''Ń?Tǟ?s''squeda': 'búsqueda',
  'Atǟ''Ń?Tǟ?s''mico': 'Atómico',
  'tǟ''Ń?Tǟ?s''cunicoS': 'técnicos',
  'contraseǟ''Ń?Tǟ?s''a': 'contraseña',
  'Exportaciǟ''Ń?Tǟ?s''n': 'Exportación',
  'Descripciǟ''Ń?Tǟ?s''n': 'Descripción',
  'Estǟ''Ń?Tǟ?s''s': 'Estás',
  'acciǟ''Ń?Tǟ?s''n': 'acción',
  'Nǟ''Ń?Tǟ?s''mero': 'Número',
  'Confirmaciǟ''Ń?Tǟ?s''n': 'Confirmación',
  'Configuraciǟ''Ń?Tǟ?s''n': 'Configuración',
  'ACTUALIZACIǟ''Ń?Tǟǽ?s.?oN': 'ACTUALIZACIÓN',
  'DINǟ''Ń?Tǟ?s''?MICA': 'DINÁMICA',
  'CONEXIǟ''Ń?Tǟǽ?s.?oN': 'CONEXIÓN',
  'revisiǟ''Ń?Tǟ?s''n': 'revisión',
  'tǟ''Ń?Tǟ?s''cnicos': 'técnicos',
  'vinculaciǟ''Ń?Tǟ?s''n': 'vinculación',
  'rǟ''Ń?Tǟ?s''pida': 'rápida',
  'reasiǟ''Ń?Tǟ?s''n': 'reasignación',
  'Reasignaciǟ''Ń?Tǟ?s''n': 'Reasignación',
  'administraciǟ''Ń?Tǟ?s''n': 'administración',
  'animaciǟ''Ń?Tǟ?s''n': 'animación',
  'ubicaciǟ''Ń?Tǟ?s''n': 'ubicación',
  'ǟ''''ǟǽ?s''ǟǽ?sǽ?z': 'ÉXITO',
  'ǟ''''ǟǽ''''ǟǽ?s''?': 'ÉXITO',
  'Inici': 'Inicia', // wait, need regex for whole words if doing this
};

files.forEach(f => {
  let txt = fs.readFileSync(f, 'utf8');
  for(let key in dict) {
    txt = txt.split(key).join(dict[key]);
  }
  
  // generic regex cleanup for leftover mangled stuff
  txt = txt.replace(/ǟ[^\s\w]+n/g, 'ón');
  txt = txt.replace(/ǟ[^\s\w]+tico/g, 'ítico');
  txt = txt.replace(/ǟ[^\s\w]+nico/g, 'nico');
  txt = txt.replace(/ǟ[^\s\w]+a/g, 'a');
  txt = txt.replace(/ǟ[^\s\w]+mico/g, 'ómico');
  
  fs.writeFileSync(f, txt, 'utf8');
});
