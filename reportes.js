// ==========================================
// MÓDULO DE REPORTES (AUTO PARTES) - LÓGICA
// ==========================================

const reportData = [
    {
        rigId: "F-03", cliente: "YPF", pozo: "LCAV - 146h", pad: "#100-2",
        actividad: "Tripping", seccion: "Final", fase: "6-3/4\"",
        td: "6195", secPadAct: "6", secPadTot: "6",
        opActuales: "Tripping por cambio de BHA por RSS - Baja Hasta 1012 mts. - Acondicona lodo hasta alcanza los 175 mts cubicos por aportes de agua.",
        proxAct: "Perforar",
        servRockit: true, servRevit: true, servSD: true, servSS: true, servPD: true, servAutoDLK: true, servCamaras: true, servRigCloud: true,
        chkRevit: { val: "OK", color: "green" }, chkRepControl: { val: "OK", color: "green" },
        chkSurveys: { val: "OK", color: "green" }, chkRigLine: { val: "NO", color: "yellow" },
        chkPlan: { val: "OK", color: "green" }, chkCaso: { val: "NO", color: "yellow" },
        chkSSFallas: { val: "NO", color: "green" }, chkTiempos: { val: "OK", color: "green" },
        chkSDFallas: { val: "NO", color: "green" }, chkArchivos: { val: "OK", color: "green" },
        jefeEquipo: "Aparicio, Dante", op1: "Operador", op2: "Velazquez, M.", op3: "Operador",
        comentarios: ""
    }
];

function toggleModuleMenu() {
    const menu = document.getElementById('moduleDropdownMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const icon = document.getElementById('mainLogoIconBtn');
    const menu = document.getElementById('moduleDropdownMenu');
    if (menu && icon && !icon.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

function switchMainModule(moduleValue) {
    const operationsModule = document.getElementById('operationsModule');
    const reportsModule = document.getElementById('reportsModule');
    const subtitle = document.getElementById('mainHeaderSubTitle');
    
    if (moduleValue === 'operaciones') {
        if(operationsModule) operationsModule.classList.remove('hidden');
        if(reportsModule) reportsModule.classList.add('hidden');
        if(subtitle) subtitle.innerText = 'Sistemas de Automatización | Centro de Operaciones | v3.6.2';
    } else if (moduleValue === 'reportes') {
        if(operationsModule) operationsModule.classList.add('hidden');
        if(reportsModule) reportsModule.classList.remove('hidden');
        if(subtitle) subtitle.innerText = 'Generador de Reportes Diarios | Auto Partes | v3.6.2';
    }
}

function renderEditableGrid() {
    const container = document.getElementById('reportEditorGrid');
    if (!container) return;
    
    let html = '';
    reportData.forEach((rig, idx) => {
        html += `<div class="rig-editor-card glass" style="margin-bottom: 20px; padding: 15px; border-radius: 8px; border-left: 5px solid var(--color-blue);">
            <h3 style="margin-top:0; color: var(--color-blue);">Equipo: ${rig.rigId}</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                <div><label>Pozo</label><input type="text" class="form-input" value="${rig.pozo}" onchange="updateRigData(${idx}, 'pozo', this.value)"></div>
                <div><label>Actividad</label><input type="text" class="form-input" value="${rig.actividad}" onchange="updateRigData(${idx}, 'actividad', this.value)"></div>
                <div style="grid-column: 1 / -1;"><label>Operaciones Actuales</label><textarea class="form-input" onchange="updateRigData(${idx}, 'opActuales', this.value)">${rig.opActuales}</textarea></div>
                <div style="grid-column: 1 / -1;"><label>Próximas Actividades</label><input type="text" class="form-input" value="${rig.proxAct}" onchange="updateRigData(${idx}, 'proxAct', this.value)"></div>
                <div style="grid-column: 1 / -1;"><label>Comentarios</label><textarea class="form-input" onchange="updateRigData(${idx}, 'comentarios', this.value)">${rig.comentarios}</textarea></div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function updateRigData(idx, field, value) {
    reportData[idx][field] = value;
    renderHiddenTemplate();
}

function renderHiddenTemplate() {
    const container = document.getElementById('reportRenderContainer');
    if (!container) return;
    
    let html = `
    <style>
        .pdf-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 8px; text-align: center; }
        .pdf-table th, .pdf-table td { border: 1px solid #000; padding: 2px; }
        .pdf-table th { background-color: #EAEAEA; font-weight: bold; }
        .bg-blue { background-color: #DCE6F1; }
        .bg-green { background-color: #92D050; }
        .bg-yellow { background-color: #FFC000; }
        .bg-red { background-color: #FF0000; color: white; }
        .rig-header { background-color: #FFFFFF; font-weight: bold; font-size: 11px; }
    </style>
    <div style="width: 1400px; padding: 20px; background: white;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 2px solid #002060; padding-bottom: 5px;">
            <h2 style="color: #002060; margin: 0; font-family: Arial;">Reporte diario de actividades de ROC Argentina - ${new Date().toLocaleDateString('es-AR')}</h2>
        </div>
        <table class="pdf-table">
    `;
    
    reportData.forEach(rig => {
        html += `
        <!-- ENCABEZADOS PRINCIPALES -->
        <tr class="bg-blue">
            <th width="4%">Rig</th><th width="5%">Cliente</th><th width="8%">Pozo</th><th width="6%">Pad</th><th width="8%">Actividad</th><th width="5%">Sección</th><th width="5%">Fase</th><th width="4%">TD</th><th colspan="3" width="6%">Sección del Pad</th>
            <th colspan="8" width="16%">Servicios disponibles</th><th colspan="4" width="15%">Check List por turno</th><th width="10%">Comentarios</th><th width="8%">Jefe de Equipo</th>
        </tr>
        
        <!-- FILA 1 DE DATOS -->
        <tr>
            <td rowspan="5" class="rig-header">${rig.rigId}</td>
            <td rowspan="5" class="rig-header">${rig.cliente}</td>
            <td rowspan="2">${rig.pozo}</td>
            <td rowspan="2">${rig.pad}</td>
            <td rowspan="2">${rig.actividad}</td>
            <td rowspan="2">${rig.seccion}</td>
            <td rowspan="2">${rig.fase}</td>
            <td rowspan="2">${rig.td}</td>
            <td rowspan="2">${rig.secPadAct}</td><td rowspan="2">de</td><td rowspan="2">${rig.secPadTot}</td>
            <th class="bg-blue">Rockit</th><th class="bg-blue">REVit</th><th class="bg-blue">SD</th><th class="bg-blue">SS</th><th class="bg-blue">PD</th><th class="bg-blue">AutoDLK</th><th class="bg-blue">Camaras</th><th class="bg-blue">RigCloud</th>
            <th class="bg-blue">ReVit</th><td class="bg-${rig.chkRevit.color}">${rig.chkRevit.val}</td><th class="bg-blue">Reporte Control</th><td class="bg-${rig.chkRepControl.color}">${rig.chkRepControl.val}</td>
            <td rowspan="5">${rig.comentarios}</td>
            <td>${rig.jefeEquipo}</td>
        </tr>
        
        <!-- FILA 2 DE DATOS -->
        <tr>
            <td colspan="8" class="bg-blue">Activos</td>
            <th class="bg-blue">Surveys Recepción</th><td class="bg-${rig.chkSurveys.color}">${rig.chkSurveys.val}</td><th class="bg-blue">Rig Line</th><td class="bg-${rig.chkRigLine.color}">${rig.chkRigLine.val}</td>
            <td>${rig.op1}</td>
        </tr>
        
        <!-- FILA 3 DE DATOS -->
        <tr>
            <th colspan="7" class="bg-blue">Operaciones Actuales</th><th colspan="4" class="bg-blue">Próximas Actividades</th>
            <td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td>
            <th class="bg-blue">PLAN cargado</th><td class="bg-${rig.chkPlan.color}">${rig.chkPlan.val}</td><th class="bg-blue">Caso</th><td class="bg-${rig.chkCaso.color}">${rig.chkCaso.val}</td>
            <td>${rig.op2}</td>
        </tr>
        
        <!-- FILA 4 DE DATOS -->
        <tr>
            <td colspan="7" rowspan="2">${rig.opActuales}</td><td colspan="4" rowspan="2">${rig.proxAct}</td>
            <td colspan="8" class="bg-blue">Servicios activos</td>
            <th class="bg-yellow">SS FALLAS</th><td class="bg-${rig.chkSSFallas.color}">${rig.chkSSFallas.val}</td><th class="bg-blue">Tiempos Conexión</th><td class="bg-${rig.chkTiempos.color}">${rig.chkTiempos.val}</td>
            <td>${rig.op3}</td>
        </tr>
        
        <!-- FILA 5 DE DATOS -->
        <tr>
            <td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td><td class="bg-green">I</td>
            <th class="bg-yellow">SD FALLAS</th><td class="bg-${rig.chkSDFallas.color}">${rig.chkSDFallas.val}</td><th class="bg-blue">Archivos guardados</th><td class="bg-${rig.chkArchivos.color}">${rig.chkArchivos.val}</td>
            <td></td>
        </tr>
        `;
    });
    
    html += `</table></div>`;
    container.innerHTML = html;
}

// Iniciar
setTimeout(() => {
    renderEditableGrid();
    renderHiddenTemplate();
}, 1000);

async function generarReporteDiario() {
    window.showToast("Generando reporte... Por favor espere.");
    
    const renderContainer = document.getElementById('reportRenderContainer');
    // Forzar que sea visible solo para el renderizado (fuera de pantalla)
    renderContainer.style.display = 'block';
    
    try {
        const canvas = await html2canvas(renderContainer, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: 1400
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // 1. Descargar Imagen
        const downloadLink = document.createElement('a');
        downloadLink.href = imgData;
        downloadLink.download = 'Reporte_Diario_ROC.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // 2. Descargar PDF
        const { jsPDF } = window.jspdf;
        // A4 landscape is 842 x 595. We scale the canvas image to fit width.
        const pdf = new jsPDF('landscape', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('Reporte_Diario_ROC.pdf');
        
        window.showToast("¡Reporte generado y descargado exitosamente!");
    } catch (err) {
        console.error("Error al generar reporte:", err);
        alert("Ocurrió un error al generar el reporte.");
    }
}
