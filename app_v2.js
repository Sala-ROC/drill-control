window.showToast = function(msg) { console.log('Toast:', msg); alert(msg); };
// DRILL CONTROL SYSTEM v3.2.2 PWA Release
// Lgica de Negocio y Base de Datos (Offline por defecto con LocalStorage)

// 1. ESTRUCTURAS DE DATOS INICIALES (Listados oficiales)
let OFFICIAl_RIGS = JSON.parse(localStorage.getItem('drill_official_rigs')) || ["F03", "F07", "F35", "M1211", "990", "F10", "F19", "F24", "F34", "F37", "991", "F15", "F26", "F36"];
let OFFICIAL_CLIENTS = JSON.parse(localStorage.getItem('drill_official_clients')) || ["YPF", "Tecpetrol", "Vista Energy", "TOTAL Energy", "Phoenix", "Geopark"];
const OFFICIAL_systems = ["REVit", "SmartDrill", "SmartSlide", "SmartNav", "AutoDownlinks", "Predictive Drilling", "Operador"];

const VERSIONS_SYSTEMS = [
    "SmartROS App", "SmartROS PLC", "Overlays & Patches", "Server Type", "Server Image", "VisionApp",
    "IPC Image", "Wrench Code", "Rig Cloud Edge", "SmartNAV", "AutoDriller",
    "Z-Torque", "AutoDAS", "SmartRACK", "SmartPOWER", "SmartSlide", "SmartPlan", "SmartDrill"
];

// Modalidades de Servicio
const MODALITIES = {
    INACTIVO: "INACTIVO",
    CONTRATO: "CONTRATO",
    SOLICITADO_CON_OP: "SOLICITADO_CON_OP",
    SOLICITADO_SIN_OP: "SOLICITADO_SIN_OP",
    SOLICITADO_MAIL: "SOLICITADO_MAIL"
};

// Nombres legibles para mostrar en pantalla de las modalidades
const MODALITY_LABELS = {
    INACTIVO: "Inactivo / Sin Solicitar",
    CONTRATO: "Activo por Contrato",
    SOLICITADO_CON_OP: "Solicitado (Con Op.)",
    SOLICITADO_SIN_OP: "Solicitado (Sin Op.)",
    SOLICITADO_MAIL: "Solicitado va Mail (Eventual)"
};

//  SISTEMA DE ROLES Y PERMISOS 
const ROLES = {
    VIEWER:      'VIEWER',      // Solo visualizacin
    REPORTER:    'REPORTER',    // Ver + Cargar casos
    RESOLVER:    'RESOLVER',    // Ver + Cargar + Cerrar
    ADMIN:       'ADMIN',       // Ver + Cargar + Cerrar + Editar + Borrar
    SUPER_ADMIN: 'SUPER_ADMIN'  // Todo + Gestin de usuarios y roles
};

const ROLE_LABELS = {
    VIEWER:      'Solo Lectura',
    REPORTER:    'Cargador',
    RESOLVER:    'Operador',
    ADMIN:       'Administrador',
    SUPER_ADMIN: 'Super Admin '
};

const ROLE_ORDER = ['VIEWER', 'REPORTER', 'RESOLVER', 'ADMIN', 'SUPER_ADMIN'];
const SUPER_ADMIN_DOC = '31434249'; // Fernando Volpi  Super Admin principal inmutable

// 2. INICIALIZACIN DE FIREBASE (v2.0.0)
const firebaseConfig = {
  apiKey: "AIzaSyBN-n6JDPttz60o1FN7pQLSmVl8a9fMDVI",
  authDomain: "sala-roc-drill-control.firebaseapp.com",
  projectId: "sala-roc-drill-control",
  storageBucket: "sala-roc-drill-control.firebasestorage.app",
  messagingSenderId: "761001663698",
  appId: "1:761001663698:web:df6cff08c9b57a6478a10b"
};

// Inicializar la app solo si no est inicializada
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ESTADO GLOBAL DE LA APLICACIN (Ahora en memoria, alimentado por Firebase)
let requestsHistory = JSON.parse(localStorage.getItem('drill_requests_history')) || [];
let usersList = JSON.parse(localStorage.getItem('drill_users_list')) || [];
let riglineCases = JSON.parse(localStorage.getItem('drill_rigline_cases')) || [];

// // Mantenemos la sesión del usuario actual en localStorage para no perderla al refrescar
let currentUser = JSON.parse(localStorage.getItem('drill_current_user_v2')) || null;

// AUTOGENERAR EQUIPOS SI LA MEMORIA ESTA VACIA (IGUAL QUE EN v1.4.0)
let rigsData = JSON.parse(localStorage.getItem('drill_rigs_data'));
if (!rigsData || rigsData.length === 0) {
    rigsData = OFFICIAl_RIGS.map((rig, idx) => {
        const sysMap = {};
        OFFICIAL_systems.forEach(s => sysMap[s] = 'INACTIVO');
        return {
            id: rig,
            client: OFFICIAL_CLIENTS[idx % OFFICIAL_CLIENTS.length],
            systems: sysMap
        };
    });
    localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
} else {
    rigsData = rigsData || [];
}

// --- DATA MIGRATION FROM EXCEL 5/22/26 (SAFE MERGE) ---
if (!localStorage.getItem('drill_excel_migration_v322c')) {
    const excelData = {"990":{"SmartSlide":"NO","SmartROS App":"SROS Core_4.5.1.0","SmartDrill":"No","Overlays & Patches":"0","SmartPlan":"No","AutoDriller":"3.1.0.2_C-001","SmartROS PLC":"PACE900_V1.2.0_B-001","Z-Torque":"TD sn 725 12/15/2024","Rig Cloud Edge":"R6.4","SmartNAV":"v10.4"},"F35":{"SmartROS App":"USPACE-I-II_4.5.2.0_C-003","AutoDriller":"3.2.1.0_C-003","Overlays & Patches":"5","Server Image":"3200-C-010","IPC Image":"3200_C8","SmartSlide":"NO","Rig Cloud Edge":"R6.4.2","AutoDAS":"Yes","SmartNAV":"v10.3","SmartDrill":"Yes","SmartPlan":"Yes","SmartROS PLC":"USPACE-I-II_4.5.2.0_C-003","Server Type":"Dell XR11"},"F10":{"SmartSlide":"YES","SmartROS App":"PACE-HHF_4.5.2.0_C-001","IPC Image":"3200_C8","SmartDrill":"Yes","Server Type":"Dell XR11","AutoDriller":"3.2.1.0_C-003","SmartPlan":"Yes","Server Image":"3200_C-010","SmartROS PLC":"PACE-HHF_4.5.2.0_C-001","Overlays & Patches":"7","Rig Cloud Edge":"R6.4","SmartNAV":"v10.4"},"991":{"SmartSlide":"NO","SmartROS App":"Rig991_4.5.2.0_B-002","IPC Image":"3200_C8","SmartDrill":"Yes","Server Type":"Dell XR2","SmartPlan":"Yes","Server Image":"3200_C-010","SmartROS PLC":"Rig991_4.5.2.0_B-002","Overlays & Patches":"1","Rig Cloud Edge":"R6.4.6","Wrench Code":"TM100_2.5.5.0_C-002_P1","SmartNAV":"v10.4"},"F34":{"SmartROS App":"USPACE-I-II_4.5.2.0_B-002","AutoDriller":"3.2.1.0_C-003","Overlays & Patches":"7","Server Image":"3200-C-010","IPC Image":"3200_C8","SmartSlide":"NO","Rig Cloud Edge":"R6.4.2","AutoDAS":"Yes","SmartNAV":"v10.4","SmartDrill":"No","SmartPlan":"Yes","SmartROS PLC":"USPACE-I-II_4.5.2.0_B-002","Server Type":"Dell XR11"},"F36":{"SmartROS App":"APPLICATION_4.5.4.1_C-008_TTM_DB15","AutoDriller":"2.3.5","Overlays & Patches":"8","Server Image":"3200_C-010","IPC Image":"3200_C8","SmartSlide":"NO","Rig Cloud Edge":"R6.4.4","AutoDAS":"Yes","SmartNAV":"v10.4","SmartDrill":"Yes","SmartPlan":"Yes","SmartROS PLC":"USPACE-I-II_4.5.2.0_B-002","Server Type":"Dell XR11"},"M1211":{"SmartDrill":"Yes","AutoDriller":"3.2.1.0_C-003","Overlays & Patches":"7","Server Image":"3200_C-010","IPC Image":"3200_C8","SmartSlide":"YES","Rig Cloud Edge":"R6.4.5","AutoDAS":"Yes","Wrench Code":"TM100_2.5.8.0_C-001","SmartNAV":"v10.1","SmartROS App":"PACE-M800_4.5.2.0_C-001","SmartPlan":"Yes","SmartROS PLC":"PACE-M800_4.5.2.0_C-001","Server Type":"Dell XR2"},"F15":{"SmartDrill":"Yes","AutoDriller":"3.2.1.0_C-003","Overlays & Patches":"12","Server Image":"3200_C-010","IPC Image":"3200_C8","SmartSlide":"NO","Rig Cloud Edge":"R6.4.6.2","AutoDAS":"Yes","Wrench Code":"ST-80","SmartNAV":"v10.5","SmartROS App":"APPLICATION_4.5.4.1_C-008_TTM_DB15","SmartPlan":"Yes","SmartROS PLC":"USPACE-I-II_4.5.2.0_C-003","Server Type":"Dell XR11"},"F37":{"SmartSlide":"NO","SmartROS App":"APPLICATION_4.5.2.0_C-003","IPC Image":"3200_C8","SmartDrill":"Yes","Server Type":"Dell XR11","SmartPlan":"Yes","Server Image":"3200_C-010","SmartROS PLC":"USPACE-I-II_4.5.2.0_C-003","Overlays & Patches":"0"},"F24":{"SmartDrill":"Yes","AutoDriller":"2.3.5","Overlays & Patches":"6","Server Image":"3200_C-010","IPC Image":"3200_C8","SmartSlide":"YES","Rig Cloud Edge":"R6.4","AutoDAS":"Yes","Wrench Code":"ST-80","SmartNAV":"v10.4","SmartROS App":"PACE-HHF_4.5.2.0_C-001","SmartPlan":"Yes","SmartROS PLC":"PACE-HHF_4.5.2.0_C-001","Server Type":"Dell XR2"},"F26":{"SmartDrill":"Yes","AutoDriller":"3.2.1.0_C-003","Overlays & Patches":"9","Server Image":"3200_C-010","IPC Image":"3200_C8","SmartSlide":"NO","Rig Cloud Edge":"R6.4.5","AutoDAS":"Yes","Wrench Code":"ST-80","SmartNAV":"v10.4","SmartROS App":"APPLICATION_4.5.4.1_C-008_TTM_DB15","SmartPlan":"Yes","SmartROS PLC":"USPACE-I-II_4.5.2.0_C-003_TTM_DB15","Server Type":"Dell XR11"},"F07":{"SmartROS App":"PACE-HHF_4.5.2.0_C-001","AutoDriller":"3.2.1.0_C-003","Overlays & Patches":"5","Server Image":"3200_C-010","IPC Image":"3200_C8","SmartSlide":"YES","Rig Cloud Edge":"R6.4.6","AutoDAS":"yes","SmartNAV":"v10.3.1","SmartDrill":"Yes","SmartPlan":"Yes","SmartROS PLC":"PACE-HHF_4.5.2.0_C-001","Server Type":"Dell XR2"},"F03":{"SmartROS App":"PACE-HHF_4.5.2.0_C-001","AutoDriller":"3.3.1.3_B-004","Overlays & Patches":"6","Server Image":"3200_C-010","IPC Image":"3200_C8","SmartSlide":"YES","Rig Cloud Edge":"R6.4","AutoDAS":"Yes","SmartNAV":"v10.4","SmartDrill":"Yes","SmartPlan":"Yes","SmartROS PLC":"PACE-HHF_4.5.2.0_C-001","Server Type":"Dell XR2"},"F19":{"SmartDrill":"Yes","AutoDriller":"2.3.5","Overlays & Patches":"4","Server Image":"3200_C-010","IPC Image":"3200_C8","SmartSlide":"YES","Rig Cloud Edge":"R6.4","AutoDAS":"yes","Wrench Code":"ST-80","SmartNAV":"v10.4","SmartROS App":"PACE-HHF_4.5.2.0_C-001","SmartPlan":"Yes","SmartROS PLC":"PACE-HHF_4.5.2.0_C-001","Server Type":"Dell DR11"}};
    
    rigsData.forEach(r => {
        if (excelData[r.id]) {
            r.versions = excelData[r.id];
            // CRITICAL FIX: Only merge the versions object to avoid wiping existing Operations data
            db.collection('rigs').doc(r.id).set({ versions: excelData[r.id] }, { merge: true });
        }
    });
    localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
    localStorage.setItem('drill_excel_migration_v322c', 'true');
    console.log("Excel migration v322c completed (SAFE MERGE)!");
}
// --- END MIGRATION ---

// 3. ELEMENTOS DEL DOM (Selectores de Interfaz)
const rigsGrid = document.getElementById('rigsGrid');
const requestsTableBody = document.getElementById('requestsTableBody');
const searchInput = document.getElementById('searchInput');
const filterClient = document.getElementById('filterClient');
const filterSystem = document.getElementById('filterSystem');
const toggleShowAllHistory = document.getElementById('toggleShowAllHistory');
const btnClearHistory = document.getElementById('btnClearHistory');
let showAllHistory = false;

// Elementos de la UI
const authScreen = document.getElementById('authScreen');
const appContainer = document.getElementById('appContainer');
const adminProfile = document.getElementById('activeUserBadge');
const activeUserName = document.getElementById('activeUserName');
const logoutBtn = document.getElementById('logoutBtn');

// Modales y Formularios
const loginForm = document.getElementById('loginForm');
const loginName = document.getElementById('loginName');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');

// Selectores KPI
const kpiTotalRigs = document.getElementById('kpiTotalRigs');
const kpiActiveServices = document.getElementById('kpiActiveServices');
const kpiRequestedServices = document.getElementById('kpiRequestedServices');
const kpiOperatorRate = document.getElementById('kpiOperatorRate');

// Pestaas Laterales
const tabRequests = document.getElementById('tabRequests');
const tabUsers = document.getElementById('tabUsers');
const tabAdminActions = document.getElementById('tabAdminActions');
const contentRequests = document.getElementById('contentRequests');
const contentUsers = document.getElementById('contentUsers');
const contentAdminActions = document.getElementById('contentAdminActions');

// Formularios y Asignacin Rpida
const requestForm = document.getElementById('requestForm');
const systemsConfigList = document.getElementById('systemsConfigList');

const createUserForm = document.getElementById('createUserForm');
const createUserFormWrapper = document.getElementById('createUserFormWrapper');
const usersPanelNoAccess = document.getElementById('usersPanelNoAccess');
const usersListWrapper = document.getElementById('usersListWrapper');
const usersListElement = document.getElementById('usersList');

let selectedRigCardId = null;

// Selectores RigLine
const rlCasesGrid = document.getElementById('rlCasesGrid');
const rlSearchInput = document.getElementById('rlSearchInput');
const rlFilterPriority = document.getElementById('rlFilterPriority');
const rlFilterRig = document.getElementById('rlFilterRig');
const rlRigSelect = document.getElementById('rlRigSelect');
const rlsystemselect = document.getElementById('rlsystemselect');
const rlPrioritySelect = document.getElementById('rlPrioritySelect');
const rlDate = document.getElementById('rlDate');
const rlTime = document.getElementById('rlTime');
const rlDescription = document.getElementById('rlDescription');
const rlReportForm = document.getElementById('rlReportForm');
const riglineActiveCasesBadge = document.getElementById('riglineActiveCasesBadge');
const rlCaseIdInput = document.getElementById('rlCaseIdInput');
const rlFilterStatus = document.getElementById('rlFilterStatus');


const kpiRlPending = document.getElementById('kpiRlPending');
const kpiRlHigh = document.getElementById('kpiRlHigh');
const kpiRlMostAffected = document.getElementById('kpiRlMostAffected');
const kpiRlClosedCount = document.getElementById('kpiRlClosedCount');

// 4. FUNCIONES DE RENDERIZACIN DE LA INTERFAZ

// Renderiza las 14 Rigs
function renderRigsGrid() {
    rigsGrid.innerHTML = '';
    
    rigsData.forEach(rig => {
        // Consultar incidentes activos en RigLine para este rig
        const pendingCasesForRig = riglineCases ? riglineCases.filter(c => c.rig === rig.id && c.status === "PENDIENTE") : [];
        const isCritical = pendingCasesForRig.length > 0;
        const hasHighPriority = pendingCasesForRig.some(c => c.priority === "Alta");
        
        let criticalClass = '';
        let warningBadge = '';
        
        if (isCritical) {
            criticalClass = hasHighPriority ? 'critical-rig' : 'warning-rig';
            const iconColor = hasHighPriority ? 'var(--color-orange)' : 'var(--color-amber)';
            const titleTooltip = hasHighPriority ? 'Estado Crítico! Caso técnico de prioridad alta activo en RigLine.' : 'Advertencia: Falla técnica activa en RigLine.';
            warningBadge = `
                <span class="rig-warning-badge" style="color: ${iconColor}; font-size: 0.72rem; display: inline-flex; align-items: center;" title="${titleTooltip}">
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </span>
            `;
        }

        // Crear Tarjeta de Rig
        const card = document.createElement('div');
        card.className = `rig-card ${selectedRigCardId === rig.id ? 'active-card' : ''} ${criticalClass}`;
        card.setAttribute('data-id', rig.id);
        
        let systemsHtml = '';
        const isAdmin = can('delete');

        OFFICIAL_systems.forEach(sys => {
            const statusClass = `status-${rig.systems[sys]}`;
            const label = sys;
            const dot = `<span class="dot"></span>`;
            const statusLabel = rig.systems[sys] === MODALITIES.INACTIVO ? 'Inactivo' :
                          rig.systems[sys] === MODALITIES.CONTRATO ? 'Activo' :
                          rig.systems[sys] === MODALITIES.SOLICITADO_CON_OP ? 'Con Op.' :
                          rig.systems[sys] === MODALITIES.SOLICITADO_SIN_OP ? 'Sin Op.' : 'Va Mail';
            
            let finBtnHtml = '';
            if (isAdmin && rig.systems[sys] === MODALITIES.SOLICITADO_MAIL) {
                finBtnHtml = `<button class="btn-fin-service" onclick="event.stopPropagation(); window.finalizeService('${rig.id}', '${sys}')" title="Finalizar Servicio" style="background: rgba(217, 70, 239, 0.15); color: #d946ef; border: 1px solid rgba(217, 70, 239, 0.4); border-radius: 4px; padding: 3px 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; box-shadow: 0 0 5px rgba(217, 70, 239, 0.3);">Fin</button>`;
            }

            systemsHtml += `
                <div class="rig-system-item" style="display: flex; align-items: center; width: 100%;">
                    <div style="flex: 1; display: flex; justify-content: flex-start;">
                        <span class="system-name">${label}</span>
                    </div>
                    <div style="flex: 1; display: flex; justify-content: center;">
                        ${finBtnHtml}
                    </div>
                    <div style="flex: 1; display: flex; justify-content: flex-end;">
                        <span class="system-status-dot-label ${statusClass}">
                            ${dot} ${statusLabel}
                        </span>
                    </div>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="rig-header">
                <span class="rig-name" style="display: flex; align-items: center; gap: 4px;">
                    Rig ${rig.id}
                    ${warningBadge}
                </span>
                <span class="rig-client-badge">${rig.client || 'Sin Contrato'}</span>
            </div>
            <div class="rig-systems-list">
                ${systemsHtml}
            </div>
        `;

        // Al hacer clic, seleccionamos la tarjeta y la cargamos en el panel de edición
        card.addEventListener('click', () => {
            selectRigCard(rig.id);
        });

        rigsGrid.appendChild(card);
    });
}



// Finaliza un servicio solicitado por mail
window.finalizeService = function(rigId, sys) {
    if (!confirm(`¿Estás seguro de que deseas finalizar el servicio eventual de ${sys} en el Rig ${rigId}?`)) return;

    const rigIndex = rigsData.findIndex(r => r.id === rigId);
    if (rigIndex === -1) return;

    rigsData[rigIndex].systems[sys] = MODALITIES.INACTIVO;
    
    // Registrar en el historial general para mantener la traza
    const newRequest = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
        rig: rigId,
        client: rigsData[rigIndex].client || "Sin Contrato",
        system: sys,
        modality: MODALITIES.INACTIVO,
        date: new Date().toISOString()
    };
    requestsHistory.unshift(newRequest);

    // Actualización local
    renderRigsGrid();
    renderRequestsTable();
    calculateKPIs();
    renderExcelSpreadsheet();
    renderExcelHistory();

    // Guardar en Firebase de forma atómica
    const batch = db.batch();
    batch.set(db.collection('history').doc(newRequest.id), newRequest);
    batch.update(db.collection('rigs').doc(rigId), {
        [`systems.${sys}`]: MODALITIES.INACTIVO
    });
    
    batch.commit().then(() => {
        if(typeof showToast === 'function') showToast(`Servicio finalizado exitosamente.`, 'success');
    }).catch(err => {
        console.error("Error finalizando servicio en nube:", err);
        if(typeof showToast === 'function') showToast(`Error de conexión al finalizar.`, 'error');
    });
};


// Renderiza el configurador de sistemas en el formulario
function rendersystemsConfigForm(rigId) {
    systemsConfigList.innerHTML = '';
    const rigObj = rigsData.find(r => r.id === rigId);
    if (!rigObj) return;
    
    OFFICIAL_systems.forEach(sys => {
        const currentModality = rigObj.systems[sys] || MODALITIES.INACTIVO;
        const isContract = currentModality === MODALITIES.CONTRATO;
                const row = document.createElement('div');
        row.className = 'system-config-row';
        row.innerHTML = `
            <span class="sys-name-label">${sys}</span>
            <label class="checkbox-label">
                <input type="checkbox" class="sys-contract-check" data-system="${sys}" ${isContract ? 'checked' : ''}>
                Contrato
            </label>
        `;

        const checkbox = row.querySelector('.sys-contract-check');
        checkbox.addEventListener('change', (e) => {
            if (!can('report')) { 
                e.preventDefault();
                checkbox.checked = !checkbox.checked; // Revertir check visual
                alert('Necesitás permisos de Cargador o superior para guardar cambios.'); 
                return; 
            }
            
            const isContractNow = checkbox.checked;
            const oldModality = rigObj.systems[sys] || MODALITIES.INACTIVO;
            let newModality = oldModality;

            if (isContractNow) {
                newModality = MODALITIES.CONTRATO;
            } else {
                if (oldModality === MODALITIES.CONTRATO) {
                    newModality = MODALITIES.INACTIVO;
                }
            }

            if (oldModality !== newModality) {
                rigObj.systems[sys] = newModality;
                
                const newRequest = {
                    id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
                    rig: rigId,
                    client: rigObj.client,
                    system: sys,
                    modality: newModality,
                    date: new Date().toISOString()
                };
                
                // Actualización optimista
                requestsHistory.unshift(newRequest);
                renderRigsGrid();
                renderRequestsTable();
                calculateKPIs();
                
                // Guardar atómicamente en Firebase
                const batch = db.batch();
                batch.set(db.collection('history').doc(newRequest.id), newRequest);
                batch.set(db.collection('rigs').doc(rigId), rigObj);
                
                batch.commit().then(() => {
                    if(typeof showToast === 'function') showToast(`Actualizado: ${sys} en equipo ${rigId}`, 'success');
                }).catch(err => {
                    console.error("Error de red al actualizar sistema:", err);
                    if(typeof showToast === 'function') showToast(`Error al sincronizar ${sys}`, 'error');
                });
            }
        });

        systemsConfigList.appendChild(row);
    });
}

// Selecciona un equipo y actualiza la seccin de carga/formulario
function selectRigCard(rigId) {
    selectedRigCardId = rigId;
    
    // Resaltar tarjeta seleccionada
    document.querySelectorAll('.rig-card').forEach(c => {
        c.classList.remove('active-card');
        if (c.getAttribute('data-id') === rigId) {
            c.classList.add('active-card');
        }
    });

    // Si somos editores, actualizamos el estado de administracin y cargamos sistemas
    if (currentUser) {
        updateAdminPanelState();
        rendersystemsConfigForm(rigId);
        switchTab('tabAdminActions');
    } else {
        // Si no somos editores, filtramos la tabla de historial con este rig
        searchInput.value = rigId;
        renderRequestsTable();
    }
}

// Renderiza la tabla de Historial/Solicitudes
function renderRequestsTable() {
    requestsTableBody.innerHTML = '';
    
    const query = searchInput.value.toLowerCase();
    const clientVal = filterClient.value;
    const sysVal = filterSystem.value;

    // Filtrar solicitudes
    let filteredRequests = requestsHistory.filter(req => {
        const matchesSearch = req.rig.toLowerCase().includes(query) || 
                              req.client.toLowerCase().includes(query) || 
                              req.system.toLowerCase().includes(query);
        const matchesClient = clientVal === "" || req.client === clientVal;
        const matchesSystem = sysVal === "" || req.system === sysVal;

        return matchesSearch && matchesClient && matchesSystem;
    });

    const totalCount = filteredRequests.length;
    let slicedRequests = filteredRequests;
    let hasLimitApplied = false;

    if (!showAllHistory && totalCount > 50) {
        slicedRequests = filteredRequests.slice(0, 50);
        hasLimitApplied = true;
    }

    // Inyectar filas en la tabla
    if (totalCount === 0) {
        requestsTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">
                    No se encontraron solicitudes registradas.
                </td>
            </tr>
        `;
        return;
    }

    slicedRequests.forEach(req => {
        const tr = document.createElement('tr');
        
        let statusLabel = MODALITY_LABELS[req.modality];
        let statusClass = `status-${req.modality}`;

        if (req.system === "REASIGNACIN") {
            if (req.modality === "Sin Contrato") {
                statusLabel = "Sin Contrato / Liberado";
                statusClass = 'status-INACTIVO'; // Gris pizarra
            } else {
                statusLabel = `Asignado a ${req.modality}`;
                statusClass = 'status-CONTRATO'; // Verde cian
            }
        }

        // Subtexto detallado si la solicitud proviene de la planilla Excel / manual
        let detailsSubtextHtml = '';
        if (req.sender) {
            let formattedDateStr = '';
            if (req.date) {
                const d = new Date(req.date);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                formattedDateStr = `${day}/${month}/${year}`;
            }
            if (req.ourContact) {
                detailsSubtextHtml = `<span class="request-details-subtext">Va: ${req.sender} (Previo: ${req.ourContact}) el ${formattedDateStr}</span>`;
            } else {
                detailsSubtextHtml = `<span class="request-details-subtext">Va: ${req.sender} el ${formattedDateStr}</span>`;
            }
        }

        tr.innerHTML = `
            <td class="td-rig">Rig ${req.rig}</td>
            <td class="td-client">${req.client}</td>
            <td class="td-system">${req.system}</td>
            <td>
                <span class="system-status-dot-label ${statusClass}" style="font-size: 0.78rem;">
                    <span class="dot"></span> ${statusLabel}
                </span>
                ${detailsSubtextHtml}
            </td>
        `;
        requestsTableBody.appendChild(tr);
    });

    if (hasLimitApplied) {
        const infoTr = document.createElement('tr');
        infoTr.innerHTML = `
            <td colspan="4" style="text-align: center; color: var(--color-cyan); padding: 10px; font-size: 0.72rem; font-style: italic; background: rgba(0, 210, 255, 0.02); border-top: 1px dashed rgba(0, 210, 255, 0.15);">
                Mostrando los 50 registros más recientes de ${totalCount}. Tilda "Mostrar todo el historial" arriba para ver todo.
            </td>
        `;
        requestsTableBody.appendChild(infoTr);
    }
}

function calculateKPIs() {
    // Total de Rigs
    kpiTotalRigs.textContent = rigsData.length;

    let activeContractCount = 0;
    let requestedMailCount = 0;
    let activeRigsWithsystems = 0;
    let activeRigsCount = 0;
    let rigsWithOperatorCount = 0;

    // PERF3: Single loop over rigsData
    rigsData.forEach(rig => {
        let hasActive = false;
        let hasActiveAutomation = false;
        let hasOperator = false;

        OFFICIAL_systems.forEach(sys => {
            const mod = rig.systems[sys];
            if (mod !== MODALITIES.INACTIVO) {
                hasActive = true;
                
                if (mod === MODALITIES.CONTRATO) {
                    activeContractCount++;
                } else if (mod === MODALITIES.SOLICITADO_MAIL || 
                           mod === MODALITIES.SOLICITADO_CON_OP || 
                           mod === MODALITIES.SOLICITADO_SIN_OP) {
                    requestedMailCount++;
                }

                if (sys !== "Operador") {
                    hasActiveAutomation = true;
                }
                if (sys === "Operador" || mod === MODALITIES.SOLICITADO_CON_OP) {
                    hasOperator = true;
                }
            }
        });

        if (hasActive) activeRigsWithsystems++;
        if (hasActiveAutomation) {
            activeRigsCount++;
            if (hasOperator) {
                rigsWithOperatorCount++;
            }
        }
    });

    kpiActiveServices.textContent = activeContractCount;
    kpiRequestedServices.textContent = requestedMailCount;

    const heroActiveRigsCount = document.getElementById('heroActiveRigsCount');
    if (heroActiveRigsCount) {
        heroActiveRigsCount.textContent = activeRigsWithsystems;
    }

    const rate = activeRigsCount > 0 ? Math.round((rigsWithOperatorCount / activeRigsCount) * 100) : 0;
    kpiOperatorRate.textContent = `${rate}%`;
}

// 6. GESTIN DE sesión, PERMISOS Y LOGIN

// Verifica si el usuario actual tiene permiso para una accin especfica
// PERF: perms object defined once outside can() to avoid recreating on every call
const ROLE_PERMS = {
    view:         ['VIEWER', 'REPORTER', 'RESOLVER', 'ADMIN', 'SUPER_ADMIN'],
    report:       ['REPORTER', 'RESOLVER', 'ADMIN', 'SUPER_ADMIN'],
    resolve:      ['RESOLVER', 'ADMIN', 'SUPER_ADMIN'],
    delete:       ['ADMIN', 'SUPER_ADMIN'],
    manage_users: ['SUPER_ADMIN'],
};
function can(action) {
    if (!currentUser) return false;
    return (ROLE_PERMS[action] || []).includes(currentUser.role || 'VIEWER');
}

// Comprobar la sesión al cargar y actualizar la UI segn el rol
function checkSession() {
    if (currentUser) {
        updateUIByRole();
    } else {
        authScreen.classList.remove('hidden');
        appContainer.style.display = 'none';
    }
}

// Actualiza toda la interfaz segn el rol del usuario autenticado
function updateUIByRole() {
    if (!currentUser) {
        authScreen.classList.remove('hidden');
        appContainer.style.display = 'none';
        return;
    }
    
    authScreen.classList.add('hidden');
    appContainer.style.display = 'flex';

    const role = currentUser.role || 'VIEWER';

    // HEADER: perfil visible
    adminProfile.classList.remove('hidden');
    activeUserName.textContent = `${currentUser.name} ${currentUser.lastName}`;
    // Avatar con iniciales
    const avatarEl = document.querySelector('.avatar');
    if (avatarEl) avatarEl.textContent =
        `${(currentUser.name[0] || '').toUpperCase()}${(currentUser.lastName[0] || '').toUpperCase()}`;
    // Badge de rol en el header
    const profileRoleEl = document.getElementById('profileRoleLabel');
    if (profileRoleEl) {
        profileRoleEl.textContent = ROLE_LABELS[role] || role;
        profileRoleEl.className = `profile-role role-badge role-badge-inline role-${role.toLowerCase()}`;
    }

    // Tab Administracin: visible para REPORTER+
    if (can('report')) {
        tabAdminActions.classList.remove('hidden');
    } else {
        tabAdminActions.classList.add('hidden');
        if (contentAdminActions && !contentAdminActions.classList.contains('hidden')) {
            switchTab('tabRequests');
        }
    }

    // Panel Usuarios: SOLO SUPER_ADMIN puede ver y gestionar
    const masterConfigBox = document.getElementById('masterConfigBox');
    if (can('manage_users')) {
        tabUsers.classList.remove('hidden');
        usersPanelNoAccess.classList.add('hidden');
        createUserFormWrapper.classList.remove('hidden');
        usersListWrapper.classList.remove('hidden');
        if (masterConfigBox) masterConfigBox.classList.remove('hidden');
        renderUsersList();
    } else {
        tabUsers.classList.add('hidden');
        usersPanelNoAccess.classList.remove('hidden');
        createUserFormWrapper.classList.add('hidden');
        if (masterConfigBox) masterConfigBox.classList.add('hidden');
        usersListWrapper.classList.add('hidden');
        // If they are currently viewing the hidden tab, switch them away
        if (contentUsers && !contentUsers.classList.contains('hidden')) {
            switchTab('tabRequests');
        }
    }

    // Botones eliminar en solicitudes: ADMIN+
    const btnExport = document.getElementById('rlExportBtn');
    const rlBtnClearHistory = document.getElementById('rlBtnClearHistory');
    if (can('delete')) {
        document.querySelectorAll('.actions-header').forEach(el => el.classList.remove('hidden'));
        if (currentUser && currentUser.role === 'SUPER_ADMIN') {
            document.querySelectorAll('.actions-header-rl').forEach(el => el.classList.remove('hidden'));
            if (rlBtnClearHistory) rlBtnClearHistory.classList.remove('hidden');
        } else {
            if (rlBtnClearHistory) rlBtnClearHistory.classList.add('hidden');
        }
        if (btnClearHistory) btnClearHistory.classList.remove('hidden');
        if (btnExport) btnExport.classList.remove('hidden');
    } else {
        document.querySelectorAll('.actions-header').forEach(el => el.classList.add('hidden'));
        if (btnClearHistory) btnClearHistory.classList.add('hidden');
        if (btnExport) btnExport.classList.add('hidden');
        if (rlBtnClearHistory) rlBtnClearHistory.classList.add('hidden');
    }

    // Panel Excel: REPORTER+
    const excelGlobalActions = document.getElementById('excelGlobalActions');
    const excelPanelNoAccess = document.getElementById('excelPanelNoAccess');
    if (can('report')) {
        if (excelGlobalActions) excelGlobalActions.classList.remove('hidden');
        if (excelPanelNoAccess) excelPanelNoAccess.classList.add('hidden');
    } else {
        if (excelGlobalActions) excelGlobalActions.classList.add('hidden');
        if (excelPanelNoAccess) excelPanelNoAccess.classList.remove('hidden');
    }

    // Refrescar todas las secciones
    updateAdminPanelState();
    renderRequestsTable();
    renderExcelSpreadsheet();
    renderExcelHistory();
    renderRigLineCases();
    calculateRigLineKPIs();
    renderRigLineHistory();
    updateRLFormByRole();
    if (typeof renderVersionsGrid === 'function') renderVersionsGrid();
}



// Actualiza el estado del formulario de reporte RigLine segn permisos del usuario
function updateRLFormByRole() {
    if (!rlReportForm) return;
    // Eliminar lock másg anterior
    const existingLock = document.getElementById('rlFormLockMsg');
    if (existingLock) existingLock.remove();

    if (!can('report')) {
        // Deshabilitar formulario
        rlReportForm.querySelectorAll('input, select, textarea, button[type="submit"]').forEach(el => {
            el.disabled = true;
        });
        rlReportForm.style.opacity = '0.35';
        rlReportForm.style.pointerEvents = 'none';
        // Inyectar mensaje de bloqueo
        const lockMsg = document.createElement('div');
        lockMsg.id = 'rlFormLockMsg';
        lockMsg.className = 'rl-form-lock-msg';
        const roleLabel = currentUser ? (ROLE_LABELS[currentUser.role] || currentUser.role) : null;
        lockMsg.innerHTML = `
            <div class="rl-lock-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </div>
            <div>
                <strong>${currentUser ? 'Permisos insuficientes' : 'Acceso restringido'}</strong><br>
                <span style="font-size:0.75rem;">
                    ${currentUser
                        ? `Tu rol actual es <strong style="color:var(--color-amber);">${roleLabel}</strong>. Necesits permisos de <strong>Cargador</strong> o superior.`
                        : 'Inici sesión con permisos de <strong>Cargador</strong> o superior para reportar casos.'
                    }
                </span>
            </div>
        `;
        if (rlReportForm.parentElement) {
            rlReportForm.parentElement.insertBefore(lockMsg, rlReportForm);
        }
    } else {
        // Habilitar formulario
        rlReportForm.querySelectorAll('input, select, textarea, button').forEach(el => {
            el.disabled = false;
        });
        rlReportForm.style.opacity = '';
        rlReportForm.style.pointerEvents = '';
        // Pre-llenar fecha y hora actuales por defecto
        if (rlDate && rlTime) {
            const now = new Date();
            rlDate.value = now.toISOString().split('T')[0];
            rlTime.value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        }
    }
}

// Actualiza el indicador de equipo seleccionado y los botones de operadora activa
function updateAdminPanelState() {
    const selectedRigDisplay = document.getElementById('selectedRigDisplay');
    const buttons = document.querySelectorAll('.btn-operator');
    
    if (selectedRigCardId) {
        const rigObj = rigsData.find(r => r.id === selectedRigCardId);
        if (rigObj) {
            if (selectedRigDisplay) {
                selectedRigDisplay.textContent = `Rig ${selectedRigCardId} (Operadora actual: ${rigObj.client || 'Ninguna'})`;
                selectedRigDisplay.classList.add('active-glow');
            }
            
            buttons.forEach(btn => {
                const client = btn.getAttribute('data-client');
                if (client === rigObj.client) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            return;
        }
    }
    
    // Estado inicial / Ningn rig seleccionado
    if (selectedRigDisplay) {
        selectedRigDisplay.textContent = "Ningn equipo seleccionado (Selecciona uno a la izquierda)";
        selectedRigDisplay.classList.remove('active-glow');
    }
    buttons.forEach(btn => btn.classList.remove('active'));
    if (systemsConfigList) {
        systemsConfigList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">Selecciona un equipo de perforacin de la izquierda para configurar sus sistemas.</div>';
    }
}

// Cambiar de Pestaa en el Panel Derecho
function switchTab(tabId) {
    const tabs = [tabRequests, tabUsers, tabAdminActions];
    const contents = [contentRequests, contentUsers, contentAdminActions];

    tabs.forEach(tab => {
        if (tab) {
            if (tab.id === tabId) tab.classList.add('active');
            else tab.classList.remove('active');
        }
    });

    contents.forEach(content => {
        if (content) {
            const expectedContentId = `content${tabId.substring(3)}`;
            if (content.id === expectedContentId) content.classList.remove('hidden');
            else content.classList.add('hidden');
        }
    });
}

// Renderiza la lista de usuarios con badges de rol y controles de gestin (SUPER_ADMIN)
function renderUsersList() {
    if (!usersListElement) return;
    usersListElement.innerHTML = '';
    const isSuperAdmin = currentUser && currentUser.role === 'SUPER_ADMIN';
    // Ordenar por nivel de rol descendente
    const sorted = [...usersList].sort((a, b) =>
        ROLE_ORDER.indexOf(b.role || 'VIEWER') - ROLE_ORDER.indexOf(a.role || 'VIEWER')
    );
    sorted.forEach(u => {
        const li = document.createElement('li');
        li.className = 'user-item';
        const isMe = currentUser && u.doc === currentUser.doc;
        const isMainSA = u.doc === SUPER_ADMIN_DOC;
        const role = u.role || 'VIEWER';
        const isOnline = u.status === 'online';
        
        const initials = (u.name.charAt(0) + (u.lastName ? u.lastName.charAt(0) : '')).toUpperCase();
        
        const roleOptionsHtml = ROLE_ORDER.map(r =>
            `<option value="${r}" ${role === r ? 'selected' : ''}>${ROLE_LABELS[r]}</option>`
        ).join('');
        
        let actionsHtml = '';
        if (isSuperAdmin && !isMe) {
            if (isMainSA) {
                actionsHtml = `<span class="role-badge role-super_admin" style="font-size:0.6rem;padding:2px 5px;"> Protegido</span>`;
            } else {
                actionsHtml = `
                    <div style="display:flex;gap:6px;align-items:center;">
                        <select class="role-select-inline" onchange="window.changeUserRole('${u.doc}', this.value)" title="Cambiar nivel de permiso">
                            ${roleOptionsHtml}
                        </select>
                        <button class="btn btn-danger-icon" onclick="window.deleteUser('${u.doc}')" style="padding:4px 7px;" title="Eliminar usuario"></button>
                    </div>`;
            }
        } else if (isMe) {
            actionsHtml = `<span style="font-size:0.68rem;color:var(--color-cyan);opacity:0.8;">(Vos)</span>`;
        }
        
        li.innerHTML = `
            <div style="display:flex; align-items:center; gap: 12px;">
                <div style="position:relative;">
                    <div style="width:36px;height:36px;border-radius:50%;background:rgba(0,210,255,0.1);color:var(--color-cyan);display:flex;align-items:center;justify-content:center;font-weight:bold;border:1px solid rgba(0,210,255,0.3);">
                        ${initials}
                    </div>
                    <div style="width:10px;height:10px;border-radius:50%;background:${isOnline ? 'var(--color-success)' : '#555'};position:absolute;bottom:0;right:0;border:2px solid var(--color-bg);"></div>
                </div>
                <div class="user-item-info">
                    <span class="user-item-name">${u.name} ${u.lastName}${isMainSA ? ' ' : ''}</span>
                    <span class="user-item-pass" style="font-size:0.7rem;">${u.email || 'Sin correo'}</span>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
                <span class="role-badge role-${role.toLowerCase()}">${ROLE_LABELS[role]}</span>
                ${actionsHtml}
            </div>
        `;
        usersListElement.appendChild(li);
    });
}

// Cambiar el rol de un usuario (Solo SUPER_ADMIN)
window.changeUserRole = function(docId, newRole) {
    if (!can('manage_users')) return;
    if (docId === SUPER_ADMIN_DOC) {
        alert('No es posible cambiar el rol de Fernando Volpi (Super Admin principal).');
        renderUsersList();
        return;
    }
    if (!ROLE_ORDER.includes(newRole)) return;
    const idx = usersList.findIndex(u => u.doc === docId);
    if (idx !== -1) {
        usersList[idx].role = newRole;
        // PERF1: Update specific user
        db.collection('users').doc(docId).set(usersList[idx]);
        renderUsersList();
    }
};

// Función auxiliar que valida credenciales contra una lista de usuarios
function tryMatchUser(list, typedName, typedPass) {
    return list.find(u => {
        if (!u || !u.name || !u.lastName) return false;
        const username = `${u.name}.${u.lastName}`.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '');
        const validPassword = u.password ? u.password === typedPass : u.doc === typedPass;
        return username === typedName && validPassword;
    });
}

function doLogin(matchedUser) {
    currentUser = matchedUser;
    localStorage.setItem('drill_current_user_v2', JSON.stringify(currentUser));
    db.collection('users').doc(currentUser.doc).update({ status: 'online' }).catch(console.error);
    updateUIByRole();
    loginForm.reset();
    loginError.classList.add('hidden');
    runFirebaseMigration();
    if (currentUser.doc !== '31434249' && (!currentUser.password || currentUser.password === currentUser.doc)) {
        document.getElementById('firstLoginModal').classList.remove('hidden');
    }
}

// Evento Formulario Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const typedName = loginName.value.trim().toLowerCase().replace(/\s+/g, '');
    const typedPass = loginPassword.value.trim();

    // 1. Buscar en la lista local (rápido)
    let matchedUser = tryMatchUser(usersList, typedName, typedPass);

    // 2. Fallback: usuario hardcodeado Fernando
    if (!matchedUser && typedName === 'fernando.volpi' && typedPass === '31434249') {
        matchedUser = { name: "Fernando", lastName: "Volpi", doc: "31434249", role: "SUPER_ADMIN" };
    }

    if (matchedUser) {
        doLogin(matchedUser);
    } else {
        // 3. No encontrado localmente → consultar Firebase directamente
        loginError.classList.add('hidden'); // hide while searching Firebase
        loginName.disabled = true;
        loginPassword.disabled = true;
        db.collection('users').get().then(snapshot => {
            const firebaseUsers = snapshot.docs.map(doc => doc.data());
            if (firebaseUsers.length > 0) {
                usersList = firebaseUsers;
                localStorage.setItem('drill_users_list', JSON.stringify(usersList));
            }
            const foundUser = tryMatchUser(firebaseUsers, typedName, typedPass);
            if (foundUser) {
                doLogin(foundUser);
            } else {
                // BUG1 FIX: must REMOVE hidden to SHOW the error message
                loginError.classList.remove('hidden');
            }
        }).catch(err => {
            console.error("Error consultando Firebase en login:", err);
            // BUG1 FIX: show error on network failure too
            loginError.classList.remove('hidden');
        }).finally(() => {
            loginName.disabled = false;
            loginPassword.disabled = false;
        });
    }
});

// Evento Toggle Password Visibility
const togglePasswordBtn = document.getElementById('togglePassword');
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
        const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        loginPassword.setAttribute('type', type);
        
        // Cambiar el icono
        if (type === 'text') {
            togglePasswordBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="eye-off-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        } else {
            togglePasswordBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        }
    });
}

// Evento Guardar/Registrar Solicitud (Sistemas de Automatizacin)
// Evento deshabilitado: El formulario ahora usa auto-guardado en cada checkbox.
requestForm.addEventListener('submit', (e) => {
    e.preventDefault();
});

// Evento Crear Nuevo Usuario (Solo SUPER_ADMIN)
createUserForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!can('manage_users')) { alert('Solo el Super Administrador puede crear usuarios.'); return; }
    const newUName    = document.getElementById('uName').value.trim();
    const newULastName = document.getElementById('uLastName').value.trim();
    const newUDoc     = document.getElementById('uDoc').value.trim();
    const newURole    = (document.getElementById('uRole') ? document.getElementById('uRole').value : 'RESOLVER') || 'RESOLVER';
    if (!newUName || !newULastName || !newUDoc) { alert('Complet todos los campos.'); return; }
    if (newUDoc === SUPER_ADMIN_DOC) { alert('Ese DNI est reservado para el Super Admin principal.'); return; }
    if (usersList.some(u => u.doc === newUDoc)) { alert('Error: Ya existe un usuario con ese nmero de documento.'); return; }
    usersList.push({ name: newUName, lastName: newULastName, doc: newUDoc, role: newURole, status: 'offline' });
    
    // Save to localStorage immediately as a fallback
    localStorage.setItem('drill_users_list', JSON.stringify(usersList));
    
    // Guardar TODOS los usuarios en Firebase de forma segura
    usersList.forEach(u => {
        try {
            if (!u || !u.doc) return; // Saltar registros corruptos
            const docId = String(u.doc).trim();
            if (docId === '') return;
            db.collection('users').doc(docId).set(u).catch(err => console.error("Error Firebase:", err));
        } catch(e) {
            console.error("Error procesando usuario local:", e);
        }
    });
      
    renderUsersList();
    createUserForm.reset();
    alert(`Usuario ${newUName} ${newULastName} creado con rol: ${ROLE_LABELS[newURole] || newURole}.`);
});

const btnAddRig = document.getElementById('btnAddRig');
if (btnAddRig) {
    btnAddRig.addEventListener('click', () => {
        if (!can('manage_users')) return;
        const rigName = prompt("Ingrese el nombre del nuevo Equipo (Ej: F99):");
        if (rigName && rigName.trim() !== "") {
            OFFICIAl_RIGS.push(rigName.trim());
            localStorage.setItem('drill_official_rigs', JSON.stringify(OFFICIAl_RIGS));
            renderRigsGrid();
            alert(`Equipo ${rigName.trim()} agregado con éxito.`);
        }
    });
}

const btnAddClient = document.getElementById('btnAddClient');
if (btnAddClient) {
    btnAddClient.addEventListener('click', () => {
        if (!can('manage_users')) return;
        const clientName = prompt("Ingrese el nombre de la nueva Operadora:");
        if (clientName && clientName.trim() !== "") {
            OFFICIAL_CLIENTS.push(clientName.trim());
            localStorage.setItem('drill_official_clients', JSON.stringify(OFFICIAL_CLIENTS));
            // Actualizar selects de clientes si es necesario en otras vistas, pero renderRigsGrid no muestra clientes, 
            // solo cuando se edita un rig.
            alert(`Operadora ${clientName.trim()} agregada con éxito.`);
        }
    });
}

// Eliminar Registro de Solicitud (Solo ADMIN+)
window.deleteRequest = function(reqId) {
    if (!can('delete')) return;
    if (!confirm("Est seguro de eliminar esta solicitud de la base de datos?")) return;

    // Buscar la solicitud para saber qu Rig y Sistema debemos resetear a INACTIVO
    const reqIndex = requestsHistory.findIndex(r => r.id === reqId);
    if (reqIndex !== -1) {
        const reqObj = requestsHistory[reqIndex];
        
        // Remover de la tabla local
        requestsHistory.splice(reqIndex, 1);
        // PERF1: Borrar solo el documento especifico en Firebase con control de errores
        db.collection('history').doc(reqObj.id).delete().catch(err => {
            console.error("Error borrando historial:", err);
            if(typeof showToast === 'function') showToast('Error al borrar de la nube', 'error');
        });

        // Comprobar si hay alguna solicitud más reciente para ese mismo Rig + Sistema
        // Si no la hay, el Rig vuelve a estar INACTIVO en ese sistema
        const hasMoreRecent = requestsHistory.find(r => r.rig === reqObj.rig && r.system === reqObj.system);
        
        const rigIndex = rigsData.findIndex(r => r.id === reqObj.rig);
        if (rigIndex !== -1) {
            rigsData[rigIndex].systems[reqObj.system] = hasMoreRecent ? hasMoreRecent.modality : MODALITIES.INACTIVO;
            // PERF1: Escribir solo el rig afectado
            db.collection('rigs').doc(reqObj.rig).set(rigsData[rigIndex]).catch(err => console.error("Error al actualizar Rig tras borrado:", err));
        }

        // Refrescar
        renderRigsGrid();
        renderRequestsTable();
        renderExcelHistory();
        calculateKPIs();
    }
};

// Eliminar Usuario (Solo SUPER_ADMIN)
window.deleteUser = function(docId) {
    if (!can('manage_users')) { alert('Solo el Super Administrador puede eliminar usuarios.'); return; }
    if (docId === SUPER_ADMIN_DOC) { alert('No es posible eliminar al Super Administrador principal (Fernando Volpi).'); return; }
    const userToDelete = usersList.find(u => u.doc === docId);
    if (!userToDelete) return;
    if (!confirm(`Eliminar a ${userToDelete.name} ${userToDelete.lastName} del sistema? Esta accin no puede deshacerse.`)) return;
    usersList = usersList.filter(u => u.doc !== docId);
    // PERF1: Borrar solo el documento en Firebase
    db.collection('users').doc(docId).delete().catch(err => {
        console.error("Error al borrar usuario:", err);
        if(typeof showToast === 'function') showToast('Error eliminando usuario en la nube.', 'error');
    });
    renderUsersList();
};

const mainLogoutBtn = document.getElementById('btnLogout') || document.getElementById('logoutBtn');
const logoutModal = document.getElementById('logoutModal');
const btnCloseLogout = document.getElementById('btnCloseLogout');
const btnCancelLogout = document.getElementById('btnCancelLogout');
const btnConfirmLogout = document.getElementById('btnConfirmLogout');

if (mainLogoutBtn && logoutModal) {
    mainLogoutBtn.addEventListener('click', () => {
        logoutModal.classList.remove('hidden');
    });
    
    const closeLogoutModal = () => logoutModal.classList.add('hidden');
    
    if (btnCloseLogout) btnCloseLogout.addEventListener('click', closeLogoutModal);
    if (btnCancelLogout) btnCancelLogout.addEventListener('click', closeLogoutModal);
    
    if (btnConfirmLogout) {
        btnConfirmLogout.addEventListener('click', () => {
            if (currentUser) {
                db.collection('users').doc(currentUser.doc).update({ status: 'offline' }).catch(() => {});
                currentUser = null;
                localStorage.removeItem('drill_current_user_v2');
                window.location.reload();
            } else {
                window.location.reload();
            }
        });
    }
}

// 8. ASOCIACIN DE BOTONES SIMPLES Y EVENTOS GENERALES

// Eventos de Pestaas
tabRequests.addEventListener('click', () => switchTab('tabRequests'));
tabUsers.addEventListener('click', () => switchTab('tabUsers'));
tabAdminActions.addEventListener('click', () => switchTab('tabAdminActions'));

// Eventos de búsqueda y Filtros
searchInput.addEventListener('input', renderRequestsTable);
filterClient.addEventListener('change', renderRequestsTable);
filterSystem.addEventListener('change', renderRequestsTable);

// Toggle para mostrar todo el historial o solo los recientes (15)
if (toggleShowAllHistory) {
    toggleShowAllHistory.addEventListener('change', function() {
        showAllHistory = this.checked;
        renderRequestsTable();
    });
}

// Botn para limpiar todo el historial acumulado
if (btnClearHistory) {
    btnClearHistory.addEventListener('click', function() {
        if (!currentUser) return;
        if (confirm("Est seguro de eliminar TODO el historial de solicitudes? Se vaciar el registro de cambios (el estado actual de los equipos no se perder).")) {
            // PERF1: Use a batch to delete all history documents safely and quickly without multiple individual requests or writing an empty array to each element
            const batch = db.batch();
            requestsHistory.forEach(h => {
                batch.delete(db.collection('history').doc(h.id));
            });
            batch.commit().catch(e => console.error("Error vaciando historial", e));
            
            requestsHistory = [];
            renderRequestsTable();
            renderExcelHistory();
            calculateKPIs();
        }
    });
}

// Asociar eventos de clic de vinculacin rpida a los botones de operadora
document.querySelectorAll('.btn-operator').forEach(btn => {
    btn.addEventListener('click', function() {
        if (!currentUser) return;
        
        const selectedClient = this.getAttribute('data-client');
        if (!selectedRigCardId) {
            alert("Por favor, selecciona primero un equipo de la izquierda.");
            return;
        }
        
        const rigIndex = rigsData.findIndex(r => r.id === selectedRigCardId);
        if (rigIndex === -1) return;
        
        const oldClient = rigsData[rigIndex].client;
        if (oldClient === selectedClient) {
            // Ya est asignado a esa operadora
            return;
        }
        
        // Confirmar reasignacin directa o liberacin de contrato
        const confirmmásg = selectedClient === "" 
            ? `Confirmar dejar al Rig ${selectedRigCardId} Sin Contrato?` 
            : `Confirmar vinculacin rpida del Rig ${selectedRigCardId} a ${selectedClient}?`;
            
        if (confirm(confirmmásg)) {
            rigsData[rigIndex].client = selectedClient;
            
            // Inyectar el registro de auditora en el historial
            const clientChangeRequest = {
                id: Date.now().toString() + "client",
                rig: selectedRigCardId,
                client: selectedClient === "" ? "Sin Contrato" : selectedClient,
                system: "REASIGNACIN",
                modality: selectedClient === "" ? "Sin Contrato" : selectedClient,
                date: new Date().toISOString()
            };
            requestsHistory.unshift(clientChangeRequest);
            
            // PERF1: Guardar solo los datos que cambiaron en la base de datos
            db.collection('rigs').doc(rigId).set(rigsData[rigIndex]);
            db.collection('history').doc(clientChangeRequest.id).set(clientChangeRequest);
            
            // Refrescar vistas
            renderRigsGrid();
            renderRequestsTable();
            calculateKPIs();
            updateAdminPanelState();
            
            // Recargar formulario de sistemas para este rig (por si cambio de cliente afecta la cabecera)
            rendersystemsConfigForm(selectedRigCardId);
        }
    });
});

// ==============================================================
// 8.5 PLANILLA DE CARGA RPIDA TIPO EXCEL (V1.0.9)
// ==============================================================

// Estructura en memoria para conservar los datos temporales del Excel (1 fila por defecto)
let excelTempData = Array.from({ length: 1 }, () => ({
    rig: '',
    system: '',
    ourContact: '',
    sender: '',
    date: '',
    time: ''
}));

// Helper para actualizar datos activos (Administradores)
window.updateActiveRowData = function(reqId, field, value) {
    const req = requestsHistory.find(r => r.id === reqId);
    if (!req) return;
    
    if (field === 'date' || field === 'time') {
        let d = req.date ? new Date(req.date) : new Date();
        let yyyy = d.getFullYear(), mm = d.getMonth(), dd = d.getDate();
        let hh = d.getHours(), min = d.getMinutes();
        
        if (field === 'date') {
            const parts = value.split('-');
            yyyy = parseInt(parts[0], 10);
            mm = parseInt(parts[1], 10) - 1;
            dd = parseInt(parts[2], 10);
        } else if (field === 'time') {
            const parts = value.split(':');
            hh = parseInt(parts[0], 10);
            min = parseInt(parts[1], 10);
        }
        
        // Forma segura para evitar saltos de mes en JavaScript
        const newD = new Date(yyyy, mm, dd, hh, min, 0, 0);
        req.date = newD.toISOString();
    } else {
        req[field] = value;
    }
};

window.saveActiveRow = function(reqId) {
    const req = requestsHistory.find(r => r.id === reqId);
    if (!req) return;
    db.collection('history').doc(req.id).set(req);
    renderExcelSpreadsheet();
};

window.enableEditRow = function(reqId) {
    const tr = document.getElementById(`active-row-${reqId}`);
    if (!tr) return;
    tr.querySelectorAll('input').forEach(input => input.disabled = false);
    
    const btnEdit = tr.querySelector('.btn-edit-active');
    const btnSave = tr.querySelector('.btn-save-active');
    if (btnEdit) btnEdit.style.display = 'none';
    if (btnSave) btnSave.style.display = 'inline-block';
};

window.deleteActiveRow = function(reqId) {
    if (!confirm('¿Estás segura de que deseas eliminar este registro por completo? Esta acción lo borrará de la tabla y desactivará el estado "Va Mail" del equipo. Esta acción no se puede deshacer.')) return;

    const reqIndex = requestsHistory.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;
    
    const req = requestsHistory[reqIndex];
    
    // Volver el estado del Rig a Inactivo
    const rigIndex = rigsData.findIndex(r => r.id === req.rig);
    if (rigIndex !== -1 && rigsData[rigIndex].systems[req.system] === MODALITIES.SOLICITADO_MAIL) {
        rigsData[rigIndex].systems[req.system] = MODALITIES.INACTIVO;
        db.collection('rigs').doc(req.rig).update({
            [`systems.${req.system}`]: MODALITIES.INACTIVO
        }).catch(err => console.error("Error reseteando rig:", err));
    }

    // Eliminar el registro
    requestsHistory.splice(reqIndex, 1);
    db.collection('history').doc(req.id).delete().then(() => {
        renderExcelSpreadsheet();
        renderExcelHistory();
        renderRigsGrid();
        calculateKPIs();
        if(typeof showToast === 'function') showToast('Registro eliminado correctamente.', 'success');
    }).catch(err => {
        console.error("Error eliminando fila activa:", err);
        if(typeof showToast === 'function') showToast('Error de red al eliminar.', 'error');
    });
};

window.deleteHistoryRow = function(reqId) {
    if (!confirm('¿Estás segura de que deseas eliminar este registro del historial? Esta acción no se puede deshacer.')) return;

    const reqIndex = requestsHistory.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;
    
    // Eliminar el registro de memoria
    requestsHistory.splice(reqIndex, 1);
    
    // Eliminar de Firebase
    db.collection('history').doc(reqId).delete().then(() => {
        renderExcelHistory();
        if(typeof showToast === 'function') showToast('Registro histórico eliminado.', 'success');
    }).catch(err => {
        console.error("Error eliminando historial:", err);
        if(typeof showToast === 'function') showToast('Error de red al eliminar histórico.', 'error');
    });
};

// Renderiza la planilla dinmica
function renderExcelSpreadsheet() {
    const tbody = document.getElementById('excelTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    let globalRowIndex = 0;
    const isAdmin = can('delete');

    // 1. Mostrar las solicitudes activas
    const activeReqs = [];
    rigsData.forEach(rig => {
        OFFICIAL_systems.forEach(sys => {
            if (rig.systems[sys] === MODALITIES.SOLICITADO_MAIL) {
                const req = requestsHistory.find(r => r.rig === rig.id && r.system === sys && r.modality === MODALITIES.SOLICITADO_MAIL);
                if (req) activeReqs.push(req);
            }
        });
    });

    activeReqs.forEach(req => {
        globalRowIndex++;
        const tr = document.createElement('tr');
        tr.id = `active-row-${req.id}`;
        
        const isSuperAdmin = can('manage_users');
        const isEditable = 'disabled';
        
        let dateVal = '';
        let timeVal = '';
        if (req.date) {
            const d = new Date(req.date);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            dateVal = `${yyyy}-${mm}-${dd}`;
            timeVal = `${hh}:${min}`;
        }

        tr.innerHTML = `
            <td class="excel-row-num" style="background: rgba(217, 70, 239, 0.1); color: #d946ef; font-weight: bold; text-align: center;" title="Servicio Activo">${globalRowIndex}</td>
            <td>
                <select class="excel-select excel-rig-select" disabled style="opacity: 0.8; color: #d946ef;">
                    <option value="${req.rig}">${req.rig}</option>
                </select>
            </td>
            <td>
                <select class="excel-select excel-system-select" disabled style="opacity: 0.8; color: #d946ef;">
                    <option value="${req.system}">${req.system}</option>
                </select>
            </td>
            <td>
                <input type="text" class="excel-input excel-ourcontact-input" placeholder="Contacto Previo..." value="${req.ourContact || ''}" ${isEditable} onchange="window.updateActiveRowData('${req.id}', 'ourContact', this.value)">
            </td>
            <td>
                <input type="email" class="excel-input excel-sender-input" placeholder="Remitente..." value="${req.sender || ''}" ${isEditable} onchange="window.updateActiveRowData('${req.id}', 'sender', this.value)">
            </td>
            <td>
                <input type="date" class="excel-input excel-date-input" value="${dateVal}" ${isEditable} onchange="window.updateActiveRowData('${req.id}', 'date', this.value)">
            </td>
            <td>
                <input type="time" class="excel-input excel-time-input" value="${timeVal}" ${isEditable} onchange="window.updateActiveRowData('${req.id}', 'time', this.value)">
            </td>
            <td>
                <div class="excel-row-actions">
                    ${isSuperAdmin ? `
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="flex: 1; display: flex; justify-content: flex-start;">
                                <span class="dot" style="background-color: #10b981; width: 18px; height: 18px; box-shadow: 0 0 8px rgba(16, 185, 129, 0.7); margin-left: 10px;" title="Procesada"></span>
                            </div>
                            <div style="flex: 1; display: flex; justify-content: center;">
                                <button type="button" class="btn btn-operator btn-excel-action btn-edit-active" onclick="window.enableEditRow('${req.id}')" style="background: rgba(14, 116, 144, 0.1); color: var(--color-cyan); border: 1px solid rgba(14, 116, 144, 0.4); padding: 4px 12px; font-size: 0.8rem; margin: 0;">Editar</button>
                                <button type="button" class="btn btn-operator btn-excel-action btn-save-active" onclick="window.saveActiveRow('${req.id}')" style="display: none; background: rgba(217, 70, 239, 0.15); color: #d946ef; border: 1px solid rgba(217, 70, 239, 0.4); padding: 4px 12px; font-size: 0.8rem; margin: 0;">Guardar</button>
                            </div>
                            <div style="flex: 1; display: flex; justify-content: flex-end;">
                                <button type="button" class="btn btn-operator btn-excel-action" onclick="window.deleteActiveRow('${req.id}')" style="background: transparent; color: #ef4444; border: none; padding: 4px 10px; margin: 0; cursor: pointer;" title="Eliminar Registro">
                                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </div>
                        </div>
                    ` : `<span style="font-size: 0.95rem; color: #10b981; display: flex; align-items: center; justify-content: center; gap: 4px; font-weight: 600; text-shadow: 0 0 8px rgba(16, 185, 129, 0.4);"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Procesada</span>`}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // 2. Mostrar las filas de carga nueva (excelTempData)
    for (let i = 0; i < excelTempData.length; i++) {
        globalRowIndex++;
        const rowData = excelTempData[i];
        const tr = document.createElement('tr');
        if (!currentUser) {
            tr.className = 'disabled-row';
        }

        // Dropdown de Rigs
        let rigOptions = '<option value="">-- Rig --</option>';
        OFFICIAl_RIGS.forEach(rig => {
            rigOptions += `<option value="${rig}" ${rowData.rig === rig ? 'selected' : ''}>${rig}</option>`;
        });

        // Dropdown de Servicios (Sistemas de automatizacin)
        let systemOptions = '<option value="">-- Servicio --</option>';
        OFFICIAL_systems.forEach(sys => {
            systemOptions += `<option value="${sys}" ${rowData.system === sys ? 'selected' : ''}>${sys}</option>`;
        });

        const isEditable = currentUser ? '' : 'disabled';
        const showClearBtn = (currentUser && currentUser.role === 'SUPER_ADMIN') ? '' : 'display: none;';

        tr.innerHTML = `
            <td class="excel-row-num" style="text-align: center;">${globalRowIndex}</td>
            <td>
                <select class="excel-select excel-rig-select" data-row="${i}" ${isEditable} onchange="window.updateExcelTempData(${i}, 'rig', this.value)">
                    ${rigOptions}
                </select>
            </td>
            <td>
                <select class="excel-select excel-system-select" data-row="${i}" ${isEditable} onchange="window.updateExcelTempData(${i}, 'system', this.value)">
                    ${systemOptions}
                </select>
            </td>
            <td>
                <input type="text" class="excel-input excel-ourcontact-input" data-row="${i}" placeholder="Contacto Previo (Ej: Juan)..." value="${rowData.ourContact || ''}" ${isEditable} oninput="window.updateExcelTempData(${i}, 'ourContact', this.value)">
            </td>
            <td>
                <input type="email" class="excel-input excel-sender-input" data-row="${i}" placeholder="Remitente (Ej: correo@ypf.com)..." list="emailHistoryList" autocomplete="off" value="${rowData.sender || ''}" ${isEditable} oninput="window.updateExcelTempData(${i}, 'sender', this.value)">
            </td>
            <td>
                <input type="date" class="excel-input excel-date-input" data-row="${i}" value="${rowData.date || ''}" ${isEditable} onchange="window.updateExcelTempData(${i}, 'date', this.value)">
            </td>
            <td>
                <input type="time" class="excel-input excel-time-input" data-row="${i}" value="${rowData.time || ''}" ${isEditable} onchange="window.updateExcelTempData(${i}, 'time', this.value)">
            </td>
            <td>
                <div class="excel-row-actions">
                    <button type="button" class="btn btn-success btn-excel-action" ${isEditable} onclick="window.processExcelRow(${i})">Procesar</button>
                    <button type="button" class="btn btn-operator btn-operator-none btn-excel-action" ${isEditable} style="border: 1px solid rgba(255, 68, 68, 0.4); text-shadow: none; ${showClearBtn}" onclick="window.clearExcelRow(${i})">Limpiar</button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    }
}

// Renderiza las ltimas 5 solicitudes procesadas de correo electrnico (modo lectura)
function renderExcelHistory() {
    // Generar o actualizar el datalist de historico de correos para el autocomplete
    let datalist = document.getElementById('emailHistoryList');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'emailHistoryList';
        document.body.appendChild(datalist);
    }
    const uniqueEmails = [...new Set(requestsHistory.map(req => req.sender ? req.sender.trim() : '').filter(e => e !== ''))];
    datalist.innerHTML = uniqueEmails.map(email => `<option value="${email}"></option>`).join('');

    const tbody = document.getElementById('excelHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Filtrar solicitudes finalizadas: Eran SOLICITADO_MAIL pero ya no estn activas
    const finalizedMailReqs = requestsHistory.filter(req => {
        if (req.modality !== MODALITIES.SOLICITADO_MAIL) return false;
        const rigObj = rigsData.find(r => r.id === req.rig);
        if (!rigObj) return true; // Si el rig fue borrado, se considera finalizado
        return rigObj.systems[req.system] !== MODALITIES.SOLICITADO_MAIL;
    });

    // Tomar las 60 ms recientes
    for (let i = 0; i < 60; i++) {
        const req = finalizedMailReqs[i];
        const tr = document.createElement('tr');

        if (req) {
            let formattedDateStr = '';
            if (req.date) {
                const d = new Date(req.date);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                formattedDateStr = `${day}/${month}/${year}`;
            }

            tr.innerHTML = `
                <td class="excel-row-num" style="text-align: center;">${i + 1}</td>
                <td style="font-weight: 600; color: var(--color-cyan);">Rig ${req.rig}</td>
                <td>${req.system}</td>
                <td style="color: #c084fc;">${req.ourContact || '-'}</td>
                <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-secondary);">${req.sender}</td>
                <td>${formattedDateStr}</td>
                <td style="text-align: center;">
                    ${can('manage_users') ? `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 4px;">
                        <span style="font-size: 0.85rem; color: #3b82f6; display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-weight: 600;">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Cerrado
                        </span>
                        <button type="button" class="btn btn-operator btn-excel-action" onclick="window.deleteHistoryRow('${req.id}')" style="background: transparent; color: #ef4444; border: none; padding: 4px; margin: 0; cursor: pointer;" title="Eliminar Registro Histórico">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                    ` : `
                    <span style="font-size: 0.85rem; color: #3b82f6; display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-weight: 600;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Cerrado
                    </span>
                    `}
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td class="excel-row-num" style="text-align: center; opacity: 0.3;">${i + 1}</td>
                <td style="color: var(--text-muted); font-style: italic; opacity: 0.5;">-</td>
                <td style="color: var(--text-muted); font-style: italic; opacity: 0.5;">-</td>
                <td style="color: var(--text-muted); font-style: italic; opacity: 0.5;">-</td>
                <td style="color: var(--text-muted); font-style: italic; opacity: 0.5;">-</td>
                <td style="color: var(--text-muted); font-style: italic; opacity: 0.5;">-</td>
                <td style="color: var(--text-muted); font-style: italic; opacity: 0.5; text-align: center;">Sin datos</td>
            `;
        }
        tbody.appendChild(tr);
    }
}

// Actualiza los valores en memoria al escribir/seleccionar en la planilla
window.updateExcelTempData = function(rowIndex, field, value) {
    if (excelTempData[rowIndex]) {
        excelTempData[rowIndex][field] = value;
    }
};

// Limpia una fila individual de la planilla
window.clearExcelRow = function(rowIndex) {
    if (excelTempData[rowIndex]) {
        excelTempData[rowIndex] = {
            rig: '',
            system: '',
            ourContact: '',
            sender: '',
            date: '',
            time: ''
        };
    }

    const tbody = document.getElementById('excelTableBody');
    if (tbody) {
        const rowEl = tbody.children[rowIndex];
        if (rowEl) {
            rowEl.querySelector('.excel-rig-select').value = '';
            rowEl.querySelector('.excel-system-select').value = '';
            rowEl.querySelector('.excel-ourcontact-input').value = '';
            rowEl.querySelector('.excel-sender-input').value = '';
            rowEl.querySelector('.excel-date-input').value = '';
            rowEl.querySelector('.excel-time-input').value = '';
        }
    }
};

// Procesa una fila individual de la planilla Excel
window.processExcelRow = function(rowIndex) {
    if (!currentUser) return;

    const row = excelTempData[rowIndex];
    const rigId = row.rig;
    const system = row.system;
    const ourContact = row.ourContact ? row.ourContact.trim() : '';
    const sender = (row.sender || '').trim();
    const dateVal = row.date;
    const timeVal = row.time;

    if (!rigId) {
        alert(`Fila ${rowIndex + 1}: Seleccione un Equipo (Rig).`);
        return;
    }
    if (!system) {
        alert(`Fila ${rowIndex + 1}: Seleccione un Servicio.`);
        return;
    }
    if (!sender) {
        alert(`Fila ${rowIndex + 1}: Ingrese el Remitente de la solicitud.`);
        return;
    }
    if (!dateVal) {
        alert(`Fila ${rowIndex + 1}: Seleccione la Fecha de recepción.`);
        return;
    }
    if (!timeVal) {
        alert(`Fila ${rowIndex + 1}: Ingrese la Hora de recepción.`);
        return;
    }

    // Timezone safe-parsing (previene error de salto de mes en JS)
    let yyyy, mm, dd, hh, min;
    const now = new Date();
    if (dateVal) {
        const parts = dateVal.split('-');
        yyyy = parseInt(parts[0], 10);
        mm = parseInt(parts[1], 10) - 1;
        dd = parseInt(parts[2], 10);
    } else {
        yyyy = now.getFullYear(); mm = now.getMonth(); dd = now.getDate();
    }
    
    if (timeVal) {
        const parts = timeVal.split(':');
        hh = parseInt(parts[0], 10);
        min = parseInt(parts[1], 10);
    } else {
        hh = 12; min = 0;
    }
    
    const d = new Date(yyyy, mm, dd, hh, min, 0, 0);
    let isoDate = d.toISOString();

    const rigIndex = rigsData.findIndex(r => r.id === rigId);
    if (rigIndex === -1) return;

    const rigObj = rigsData[rigIndex];
    const clientName = rigObj.client || "Sin Contrato";

    // Actualizar base de datos
    rigObj.systems[system] = MODALITIES.SOLICITADO_MAIL;

    const newRequest = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
        rig: rigId,
        client: clientName,
        system: system,
        modality: MODALITIES.SOLICITADO_MAIL,
        ourContact: ourContact,
        sender: sender,
        date: isoDate
    };

    requestsHistory.unshift(newRequest);

    // Guardado Atómico (Batch) con control de errores
    const batch = db.batch();
    batch.set(db.collection('rigs').doc(rigId), rigObj);
    batch.set(db.collection('history').doc(newRequest.id), newRequest);
    
    batch.commit().catch(err => {
        console.error("Error al procesar fila Excel:", err);
        if(typeof showToast === 'function') showToast("Error de red al procesar fila", "error");
    });

    // Limpiar fila procesada
    window.clearExcelRow(rowIndex);

    // Refrescar vistas - INCLUYENDO EXCEL SPREADSHEET PARA QUE NO DESAPAREZCA
    renderRigsGrid();
    renderRequestsTable();
    renderExcelHistory();
    renderExcelSpreadsheet();
    calculateKPIs();
    updateAdminPanelState();
};

// Eventos globales del Excel
const btnExcelProcessAll = document.getElementById('btnExcelProcessAll');
if (btnExcelProcessAll) {
    btnExcelProcessAll.addEventListener('click', () => {
        if (!currentUser) return;

        let processedCount = 0;
        let anyChange = false;
        const bulkBatch = db.batch();

        for (let i = 0; i < excelTempData.length; i++) {
            const row = excelTempData[i];
            const rigId = row.rig;
            const system = row.system;
            const ourContact = row.ourContact ? row.ourContact.trim() : '';
            const sender = (row.sender || '').trim();
            const dateVal = row.date;
            const timeVal = row.time;

            // Fila completa si tiene todos los datos obligatorios
            if (rigId && system && sender && dateVal && timeVal) {
                let yyyy, mm, dd, hh, min;
                const now = new Date();
                if (dateVal) {
                    const parts = dateVal.split('-');
                    yyyy = parseInt(parts[0], 10);
                    mm = parseInt(parts[1], 10) - 1;
                    dd = parseInt(parts[2], 10);
                } else {
                    yyyy = now.getFullYear(); mm = now.getMonth(); dd = now.getDate();
                }
                
                if (timeVal) {
                    const parts = timeVal.split(':');
                    hh = parseInt(parts[0], 10);
                    min = parseInt(parts[1], 10);
                } else {
                    hh = 12; min = 0;
                }
                
                const d = new Date(yyyy, mm, dd, hh, min, 0, 0);
                let isoDate = d.toISOString();

                const rigIndex = rigsData.findIndex(r => r.id === rigId);
                if (rigIndex !== -1) {
                    const rigObj = rigsData[rigIndex];
                    const clientName = rigObj.client || "Sin Contrato";

                    rigObj.systems[system] = MODALITIES.SOLICITADO_MAIL;

                    const newRequest = {
                        id: (Date.now() + i).toString() + Math.random().toString(36).substring(2, 7),
                        rig: rigId,
                        client: clientName,
                        system: system,
                        modality: MODALITIES.SOLICITADO_MAIL,
                        ourContact: ourContact,
                        sender: sender,
                        date: isoDate
                    };

                    requestsHistory.unshift(newRequest);
                    
                    // Aseguramos guardar en batch
                    bulkBatch.set(db.collection('rigs').doc(rigId), rigObj);
                    bulkBatch.set(db.collection('history').doc(newRequest.id), newRequest);
                    
                    window.clearExcelRow(i);
                    processedCount++;
                    anyChange = true;
                }
            }
        }

        if (anyChange) {
            bulkBatch.commit().catch(err => {
                console.error("Error en procesamiento masivo:", err);
                if(typeof showToast === 'function') showToast("Error al procesar lote", "error");
            });

            renderRigsGrid();
            renderRequestsTable();
            renderExcelHistory();
            renderExcelSpreadsheet();
            calculateKPIs();
            updateAdminPanelState();

            alert(`Se procesaron ${processedCount} solicitudes de correo con éxito.`);
        } else {
            alert("No hay filas completas para procesar. Seleccione al menos un Rig y Servicio.");
        }
    });
}

const btnExcelClearAll = document.getElementById('btnExcelClearAll');
if (btnExcelClearAll) {
    btnExcelClearAll.addEventListener('click', () => {
        if (!currentUser) return;
        if (confirm("Confirmar limpieza completa de las 5 filas de la planilla? Se perder lo que no haya sido procesado.")) {
            for (let i = 0; i < 5; i++) {
                window.clearExcelRow(i);
            }
        }
    });
}

// ==============================================================
// 8.8 LGICA DE NEGOCIO Y CONTROLADOR DE RIGLINE (CASOS técnicoS)
// ==============================================================

// Alternar Pestaa Global (Automatizacin / RigLine / Versiones)
window.switchGlobalTab = function(tabId) {
    const globalTabAutomation = document.getElementById('globalTabAutomation');
    const globalTabRigLine = document.getElementById('globalTabRigLine');
    const globalTabVersions = document.getElementById('globalTabVersions');
    
    const tabContentAutomation = document.getElementById('tabContentAutomation');
    const tabContentRigLine = document.getElementById('tabContentRigLine');
    const tabContentVersions = document.getElementById('tabContentVersions');

    if (!globalTabAutomation || !globalTabRigLine || !tabContentAutomation || !tabContentRigLine) return;

    // Reset all
    [globalTabAutomation, globalTabRigLine, globalTabVersions].forEach(el => {
        if (el) el.classList.remove('active');
    });
    [tabContentAutomation, tabContentRigLine, tabContentVersions].forEach(el => {
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('active');
        }
    });

    if (tabId === 'automation') {
        globalTabAutomation.classList.add('active');
        tabContentAutomation.classList.remove('hidden');
        tabContentAutomation.classList.add('active');
        
        // Refrescar datos
        renderRigsGrid();
        renderRequestsTable();
        calculateKPIs();
    } else if (tabId === 'rigline') {
        globalTabRigLine.classList.add('active');
        tabContentRigLine.classList.remove('hidden');
        tabContentRigLine.classList.add('active');
        
        // Refrescar datos de RigLine
        renderRigLineCases();
        calculateRigLineKPIs();
    } else if (tabId === 'versions') {
        if (globalTabVersions) globalTabVersions.classList.add('active');
        if (tabContentVersions) {
            tabContentVersions.classList.remove('hidden');
            tabContentVersions.classList.add('active');
        }
        
        // Refrescar Grid de Versiones
        if (typeof renderVersionsGrid === 'function') renderVersionsGrid();
    }
};

// Rellenar dinmicamente los pozos en los filtros y formulario de RigLine
function populateRigLineDropdowns() {
    if (!rlFilterRig || !rlRigSelect) return;
    
    rlFilterRig.innerHTML = '<option value="">Todos los Rigs</option>';
    rlRigSelect.innerHTML = '<option value="">-- Seleccionar Rig --</option>';
    
    OFFICIAl_RIGS.forEach(rig => {
        const optFilter = document.createElement('option');
        optFilter.value = rig;
        optFilter.textContent = `Rig ${rig}`;
        rlFilterRig.appendChild(optFilter);
        
        const optSelect = document.createElement('option');
        optSelect.value = rig;
        optSelect.textContent = `Rig ${rig}`;
        rlRigSelect.appendChild(optSelect);
    });
}

// Renderizar la lista de casos RigLine segn estado y filtros
function renderRigLineCases() {
    if (!rlCasesGrid) return;
    
    rlCasesGrid.innerHTML = '';
    
    const query = rlSearchInput ? rlSearchInput.value.toLowerCase().trim() : '';
    const priorityVal = rlFilterPriority ? rlFilterPriority.value : '';
    const rigVal = rlFilterRig ? rlFilterRig.value : '';
    const statusVal = rlFilterStatus ? rlFilterStatus.value : 'PENDIENTE';
    
    // Filtrar casos segn estado y filtros
    const filteredCases = riglineCases.filter(c => {
        // Filtro de estado
        if (statusVal === 'PENDIENTE' && c.status !== 'PENDIENTE') return false;
        if (statusVal === 'RESUELTO' && c.status !== 'RESUELTO') return false;
        
        const matchesSearch = c.id.toLowerCase().includes(query) ||
                              c.rig.toLowerCase().includes(query) ||
                              c.system.toLowerCase().includes(query) ||
                              c.description.toLowerCase().includes(query) ||
                              c.reporter.toLowerCase().includes(query);
                              
        const matchesPriority = priorityVal === "" || c.priority === priorityVal;
        const matchesRig = rigVal === "" || c.rig === rigVal;
        
        return matchesSearch && matchesPriority && matchesRig;
    });
    
    if (filteredCases.length === 0) {
        rlCasesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px; background: rgba(0, 0, 0, 0.15); border: 1px dashed var(--glass-border); border-radius: 8px;">
                <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; color: var(--text-muted); opacity: 0.7;"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <p style="font-size: 0.9rem;">No hay casos que coincidan con los filtros y el estado seleccionado.</p>
            </div>
        `;
        return;
    }
    
    filteredCases.forEach(c => {
        const card = document.createElement('div');
        
        // Estilo segn prioridad para el borde neon sutil
        let priorityClass = 'low-priority';
        let badgeClass = 'low';
        if (c.priority === 'Alta') {
            priorityClass = 'high-priority';
            badgeClass = 'high';
        } else if (c.priority === 'Media') {
            priorityClass = 'medium-priority';
            badgeClass = 'medium';
        }
        
        // Aplicar clase resolved-case si est resuelto
        if (c.status === 'RESUELTO') {
            card.className = `case-card resolved-case`;
        } else {
            card.className = `case-card ${priorityClass}`;
        }
        card.setAttribute('data-case-id', c.id);
        
        // Formatear fecha y hora local de reporte
        let timeLabel = '';
        if (c.date) {
            const dateObj = new Date(c.date);
            const timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            timeLabel = `Reportado: ${dateStr} - ${timeStr}`;
        }

        // Formatear fecha y hora local de cierre
        let closedTimeLabel = '';
        if (c.status === "RESUELTO" && c.closedDate) {
            const dateObj = new Date(c.closedDate);
            const timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            closedTimeLabel = `<span class="case-time" style="color: var(--color-green); opacity: 0.9; margin-top: 2px;">Cerrado: ${dateStr} - ${timeStr}</span>`;
        }
        
        // Visibilidad y control de accin de cierre segn permisos (Editor)
        let actionHtml = '';
        if (currentUser) {
            const deleteBtnHtml = `
                <button type="button" class="btn btn-danger-icon" style="padding: 6px; border-radius: 6px;" onclick="window.deleteRigLineCase('${c.id}')" title="Eliminar Caso permanentemente">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            `;
            
            if (c.status === "PENDIENTE") {
                actionHtml = `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${deleteBtnHtml}
                        <button type="button" class="btn btn-success" style="padding: 6px 12px; font-size: 0.76rem;" onclick="window.closeRigLineCase('${c.id}')">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon-spacing"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Resolver y Cerrar
                        </button>
                    </div>
                `;
            } else {
                actionHtml = `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${deleteBtnHtml}
                    </div>
                `;
            }
        } else {
            if (c.status === "PENDIENTE") {
                actionHtml = `
                    <div class="action-lock-box">
                        <button type="button" class="btn btn-disabled" style="padding: 6px 12px; font-size: 0.76rem;" title="Inicia sesión como Editor para resolver este caso" disabled>
                            Resolver y Cerrar
                        </button>
                        <span class="action-lock-label">
                            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Solo Editores
                        </span>
                    </div>
                `;
            } else {
                actionHtml = '';
            }
        }
        
        let resolvedBadge = '';
        if (c.status === "RESUELTO") {
            resolvedBadge = `<span class="case-priority-badge resolved"> Resuelto</span>`;
        }
        
        card.innerHTML = `
            <div class="case-top-row">
                <span class="case-id">${c.id}</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <span class="case-priority-badge ${badgeClass}">${c.priority}</span>
                    ${resolvedBadge}
                </div>
            </div>
            <div class="case-rig-block">
                <span class="case-rig-name">Rig ${c.rig}</span>
                <span class="case-system-name">${c.system}</span>
            </div>
            <div class="case-description">
                ${c.description}
            </div>
            <div class="case-footer">
                <div class="case-meta">
                    <span class="case-reporter">Report: <strong style="color: var(--text-primary);">${c.reporter}</strong></span>
                    ${c.resolver ? `<span class="case-reporter">Resolvi: <strong style="color: var(--text-primary);">${c.resolver}</strong></span>` : ''}
                    <span class="case-time">${timeLabel}</span>
                    ${closedTimeLabel}
                </div>
                <div class="case-action">
                    ${actionHtml}
                </div>
            </div>
        `;
        
        rlCasesGrid.appendChild(card);
    });
}

// Calcular mtricas de RigLine y refrescar en pantalla
function calculateRigLineKPIs() {
    if (!riglineCases) return;
    
    const pendingCases = riglineCases.filter(c => c.status === "PENDIENTE");
    const closedCases = riglineCases.filter(c => c.status === "RESUELTO");
    
    // 1. Casos Pendientes Activos
    if (kpiRlPending) kpiRlPending.textContent = pendingCases.length;
    
    // 2. Casos de Alta Prioridad Activos
    const highPriorityCount = pendingCases.filter(c => c.priority === "Alta").length;
    if (kpiRlHigh) kpiRlHigh.textContent = highPriorityCount;
    
    // 3. Casos Resueltos Totales en Historial
    if (kpiRlClosedCount) kpiRlClosedCount.textContent = closedCases.length;
    
    // 4. Equipo (Rig) más afectado por fallas tcnicas pendientes
    let rigCounts = {};
    pendingCases.forEach(c => {
        rigCounts[c.rig] = (rigCounts[c.rig] || 0) + 1;
    });
    
    let mostAffectedRig = "-";
    let maxCount = 0;
    for (const rig in rigCounts) {
        if (rigCounts[rig] > maxCount) {
            maxCount = rigCounts[rig];
            mostAffectedRig = `Rig ${rig} (${maxCount})`;
        }
    }
    if (kpiRlMostAffected) kpiRlMostAffected.textContent = mostAffectedRig;
    
    // 5. Badge contador naranja de la pestaa global RigLine
    if (riglineActiveCasesBadge) {
        const activeCount = pendingCases.length;
        if (activeCount > 0) {
            riglineActiveCasesBadge.textContent = activeCount;
            riglineActiveCasesBadge.style.display = 'inline-block';
        } else {
            riglineActiveCasesBadge.style.display = 'none';
        }
    }

    // 6. Alertas RigLine Activas en el Hero Banner
    const heroCriticalIncidentsCount = document.getElementById('heroCriticalIncidentsCount');
    if (heroCriticalIncidentsCount) {
        heroCriticalIncidentsCount.textContent = pendingCases.length;
    }
}

// Generar e insertar un nuevo caso técnico reportado
if (rlReportForm) {
    rlReportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (rlReportForm.dataset.submitting === "true") return;
        rlReportForm.dataset.submitting = "true";
        
        const caseId = rlCaseIdInput.value.trim();
        const rigId = rlRigSelect.value;
        const system = rlsystemselect.value;
        const priority = rlPrioritySelect.value;
        const reporterName = currentUser ? `${currentUser.name} ${currentUser.lastName}` : "Usuario Desconocido";
        const description = rlDescription.value.trim();
        const eventDate = rlDate ? rlDate.value : '';
        const eventTime = rlTime ? rlTime.value : '';
        
        if (!caseId || !rigId || !system || !priority || !description || !eventDate || !eventTime) {
            alert("Por favor, complete todos los campos obligatorios.");
            rlReportForm.dataset.submitting = "false";
            return;
        }
        
        // Validar que el identificador ingresado sea nico
        const caseExists = riglineCases.some(c => c.id.toLowerCase() === caseId.toLowerCase());
        if (caseExists) {
            alert(`Error: Ya existe un caso registrado bajo el nmero "${caseId}". Por favor, introduce un identificador nico.`);
            return;
        }
        
        const newCase = {
            id: caseId,
            rig: rigId,
            system: system,
            priority: priority,
            reporter: reporterName,
            description: description,
            status: "PENDIENTE",
            date: new Date(`${eventDate}T${eventTime}:00`).toISOString()
        };
        
        riglineCases.unshift(newCase);
        db.collection('rigline').doc(newCase.id).set(newCase).finally(() => { rlReportForm.dataset.submitting = "false"; });
        
        // Resetear el formulario
        rlReportForm.reset();
        
        // Refrescar vistas y mtricas de RigLine y del Centro de Control
        renderRigLineCases();
        calculateRigLineKPIs();
        renderRigsGrid();
        calculateKPIs();
        renderRigLineHistory();
        
        alert(`Caso creado con éxito bajo el registro ${caseId}. Se dar seguimiento inmediato.`);
    });
}


// Resolver y cerrar un caso (Exclusivo de Editores autorizados)
window.closeRigLineCase = function(caseId) {
    if (!can('resolve')) {
        alert("Acceso denegado. Necesits permisos de Operador o superior para cerrar casos.");
        return;
    }
    
    if (!confirm(`Confirmar marcado de resolucin para el caso ${caseId}? Se archivar del panel activo.`)) {
        return;
    }
    
    const caseIndex = riglineCases.findIndex(c => c.id === caseId);
    if (caseIndex !== -1) {
        // Encontrar tarjeta para animacin de salida sutil
        const card = document.querySelector(`[data-case-id="${caseId}"]`);
        if (card) {
            card.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
            card.style.transform = 'scale(0.9) translateY(12px)';
            card.style.opacity = '0';
        }
        
        setTimeout(() => {
            riglineCases[caseIndex].status = "RESUELTO";
            riglineCases[caseIndex].resolver = `${currentUser.name} ${currentUser.lastName}`;
            riglineCases[caseIndex].closedDate = new Date().toISOString();
            
            // PERF1: Write only the updated case
            db.collection('rigline').doc(caseId).set(riglineCases[caseIndex]);
            
            // Refrescar vistas
            renderRigLineCases();
            calculateRigLineKPIs();
            renderRigsGrid();
            calculateKPIs();
            renderRigLineHistory();
        }, 350); // Sincronizado con la duracin de la animacin
    }
};

// Eliminar permanentemente un caso (Exclusivo de Editores autorizados con contraseña)
window.exportRigLineHistoryTXT = function() {
    if (!can('delete')) {
        alert("Acceso denegado. Necesitas permisos de Administrador o superior para exportar el historial.");
        return;
    }
    
    // Obtener los casos resueltos
    const resolvedCases = riglineCases.filter(c => c.status === 'RESUELTO');
    const sorted = [...resolvedCases].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sorted.length === 0) {
        alert("No hay casos en el historial para exportar.");
        return;
    }
    
    // Función helper para formatear fechas
    function fmtDate(iso) {
        if (!iso) return 'N/A';
        const d = new Date(iso);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear());
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yy} ${hh}:${min}`;
    }
    
    let txtContent = "==================================================\r\n";
    txtContent += "REPORTE HISTÓRICO RIGLINE\r\n";
    txtContent += `Fecha de Exportación: ${fmtDate(new Date().toISOString())}\r\n`;
    txtContent += `Total de Casos Resueltos: ${sorted.length}\r\n`;
    txtContent += "==================================================\r\n\r\n";
    
    sorted.forEach(c => {
        txtContent += `[CASO: ${c.id}]\r\n`;
        txtContent += `Estado: ${c.status}\r\n`;
        txtContent += `Prioridad: ${c.priority}\r\n`;
        txtContent += `Equipo: ${c.rig}\r\n`;
        txtContent += `Sistema/Falla: ${c.system}\r\n`;
        txtContent += `Reportado Por: ${c.reporter}\r\n`;
        txtContent += `Resuelto Por: ${c.resolver || 'N/A'}\r\n`;
        txtContent += `Fecha Apertura: ${fmtDate(c.date)}\r\n`;
        txtContent += `Fecha Cierre: ${fmtDate(c.closedDate)}\r\n`;
        txtContent += `Descripción:\r\n${c.description}\r\n`;
        txtContent += "--------------------------------------------------\r\n\r\n";
    });
    
    // Generar Blob y descargar
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `historial_rigline_${dateStr}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.clearRigLineHistory = function() {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
        alert("Acceso denegado.");
        return;
    }
    
    const resolvedCases = riglineCases.filter(c => c.status === 'RESUELTO');
    if (resolvedCases.length === 0) {
        alert("No hay casos cerrados en el historial para eliminar.");
        return;
    }
    
    if (confirm("¿Deseas descargar una copia de seguridad en TXT antes de proceder a vaciar el historial?")) {
        exportRigLineHistoryTXT();
    }
    
    const typedPassword = prompt(`ADVERTENCIA PELIGRO: Estás a punto de eliminar permanentemente TODOS los ${resolvedCases.length} casos cerrados del historial.\n\nEsta acción no se puede deshacer.\nIngrese su contraseña de Super Admin (Número de documento) para confirmar:`);
    
    if (typedPassword === null) return;
    
    if (typedPassword.trim() !== currentUser.doc) {
        alert("Contraseña incorrecta. Operación cancelada.");
        return;
    }
    
    // Ejecutar borrado
    const deletePromises = resolvedCases.map(c => db.collection('rigline').doc(c.id).delete());
    
    Promise.all(deletePromises).then(() => {
        // Remover de la memoria local
        const resolvedIds = resolvedCases.map(c => c.id);
        riglineCases = riglineCases.filter(c => !resolvedIds.includes(c.id));
        
        renderRigLineCases();
        renderRigLineHistory();
        calculateRigLineKPIs();
        showToast("Historial vaciado con éxito.");
    }).catch(err => {
        console.error(err);
        alert("Ocurrió un error al intentar vaciar el historial.");
    });
};

window.deleteRigLineCase = function(caseId) {
    if (!can('delete')) {
        alert("Acceso denegado. Necesits permisos de Administrador o superior para eliminar casos permanentemente.");
        return;
    }
    
    // Solicitar contraseña de Confirmación
    const typedPassword = prompt(`ADVERTENCIA: Confirmar la eliminacin permanente del caso ${caseId}?\n\nEsta accin no se puede deshacer. Ingrese su contraseña de Editor (Nmero de documento) para confirmar:`);
    
    if (typedPassword === null) {
        // El usuario cancel el prompt
        return;
    }
    
    if (typedPassword.trim() !== currentUser.doc) {
        alert("contraseña incorrecta. La eliminacin del caso ha sido cancelada.");
        return;
    }
    
    const caseIndex = riglineCases.findIndex(c => c.id === caseId);
    if (caseIndex !== -1) {
        // Encontrar tarjeta para animacin de salida sutil de rotacin y escala
        const card = document.querySelector(`[data-case-id="${caseId}"]`);
        if (card) {
            card.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
            card.style.transform = 'scale(0.8) rotate(-3deg)';
            card.style.opacity = '0';
        }
        
        setTimeout(() => {
            // PERF1: Delete the specific case in Firebase
            db.collection('rigline').doc(caseId).delete().catch(err => {
                console.error("Error borrando caso:", err);
                if(typeof showToast === 'function') showToast('Error eliminando caso en la nube.', 'error');
            });
            riglineCases.splice(caseIndex, 1);
            
            // Refrescar vistas
            renderRigLineCases();
            calculateRigLineKPIs();
            renderRigsGrid();
            calculateKPIs();
            renderRigLineHistory();
        }, 350); // Sincronizado con la duracin de la animacin
    }
};

// ==============================================================
// 8.9 EXPORTACIN DE CASOS RIGLINE A TXT
// ==============================================================
const btnExportRigLine = document.getElementById('btnExportRigLine');
if (btnExportRigLine) {
    btnExportRigLine.addEventListener('click', () => {
        // Filtrar casos pendientes
        const pendingCases = riglineCases.filter(c => c.status === 'PENDIENTE');
        
        if (pendingCases.length === 0) {
            alert('No hay casos pendientes activos para exportar.');
            return;
        }

        // Helper de fecha
        const fmtDate = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        };

        // Construir contenido del TXT
        let txtContent = `=================================================================\r\n`;
        txtContent += `       REPORTE DE CASOS PENDIENTES - DRILL CONTROL RIGLINE\r\n`;
        txtContent += `=================================================================\r\n`;
        txtContent += `Generado el: ${fmtDate(new Date().toISOString())}\r\n`;
        txtContent += `Total Casos Activos: ${pendingCases.length}\r\n\r\n`;

        pendingCases.forEach(c => {
            txtContent += `-----------------------------------------------------------------\r\n`;
            txtContent += `N CASO   : ${c.id}\r\n`;
            txtContent += `EQUIPO    : ${c.rig}\r\n`;
            txtContent += `SISTEMA   : ${c.system}\r\n`;
            txtContent += `PRIORIDAD : ${c.priority}\r\n`;
            txtContent += `FECHA     : ${fmtDate(c.date)}\r\n`;
            txtContent += `REPORTANTE: ${c.reporter}\r\n`;
            txtContent += `DESCRIPCIN:\r\n${c.description}\r\n`;
        });
        
        txtContent += `-----------------------------------------------------------------\r\n`;
        txtContent += `FIN DEL REPORTE\r\n`;

        // Crear Blob y forzar descarga
        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `RigLine_Pendientes_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// Conectar filtros de RigLine a eventos de cambio
if (rlSearchInput) rlSearchInput.addEventListener('input', renderRigLineCases);
if (rlFilterPriority) rlFilterPriority.addEventListener('change', renderRigLineCases);
if (rlFilterRig) rlFilterRig.addEventListener('change', renderRigLineCases);
if (rlFilterStatus) rlFilterStatus.addEventListener('change', renderRigLineCases);

// 
// HISTORIAL COMPLETO DE CASOS RIGLINE  Planilla al pie de pgina
// 
function renderRigLineHistory() {
    const tbody = document.getElementById('rlHistoryTableBody');
    const countEl = document.getElementById('rlHistoryTotalCount');
    const searchEl = document.getElementById('rlHistorySearch');
    if (!tbody) return;

    const query = searchEl ? searchEl.value.toLowerCase().trim() : '';

    // Ordenar todos los casos de más reciente a más antiguo (por fecha de apertura)
    const resolvedCases = riglineCases.filter(c => c.status === 'RESUELTO');
    const sorted = [...resolvedCases].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Aplicar búsqueda rpida sobre todos los campos visibles
    const filtered = query
        ? sorted.filter(c =>
            c.id.toLowerCase().includes(query) ||
            c.rig.toLowerCase().includes(query) ||
            c.system.toLowerCase().includes(query) ||
            c.priority.toLowerCase().includes(query) ||
            c.reporter.toLowerCase().includes(query) ||
            (c.resolver || '').toLowerCase().includes(query)
          )
        : sorted;

    // Actualizar contador
    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="rl-history-empty">
                    ${query ? 'No se encontraron casos para "' + query + '".' : 'No hay casos registrados an.'}
                </td>
            </tr>`;
        return;
    }

    // Helper de formato de fecha compacta
    function fmtDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(2);
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yy} ${hh}:${min}`;
    }

    tbody.innerHTML = filtered.map(c => {
        const prioClass = c.priority === 'Alta' ? 'alta' : c.priority === 'Media' ? 'media' : 'baja';
        const rowClass  = `rl-row-${prioClass}${c.status === 'RESUELTO' ? ' rl-row-resuelto' : ''}`;
        const statusBadge = c.status === 'RESUELTO'
            ? `<span class="rl-status-badge resuelto"> Resuelto</span>`
            : `<span class="rl-status-badge pendiente"> Pendiente</span>`;
        const closedDateHtml = c.closedDate
            ? `<span class="rl-history-date closed">${fmtDate(c.closedDate)}</span>`
            : `<span style="color: var(--color-inactive); font-size: 0.7rem;"></span>`;

        return `
            <tr class="${rowClass}">
                <td class="rl-history-case-id">${c.id}</td>
                <td class="rl-history-rig">${c.rig}</td>
                <td style="color: var(--text-primary); max-width: 140px; overflow: hidden; text-overflow: ellipsis;">${c.system}</td>
                <td><span class="rl-priority-dot ${prioClass}">${c.priority}</span></td>
                <td style="color: var(--text-muted);">${c.reporter}</td>
                <td style="color: var(--text-muted);">${c.resolver || '<span style="opacity:0.4;"></span>'}</td>
                <td class="rl-history-date">${fmtDate(c.date)}</td>
                <td>${closedDateHtml}</td>
                <td>${statusBadge}</td>
                <td class="actions-header-rl ${ currentUser && currentUser.role === 'SUPER_ADMIN' ? '' : 'hidden' }" style="text-align: center;">
                    ${ currentUser && currentUser.role === 'SUPER_ADMIN' ? `<button class="btn btn-danger-icon" onclick="deleteRigLineCase('${c.id}')" title="Eliminar Registro"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>` : '' }
                </td>
            </tr>`;
    }).join('');
}

// Conectar la búsqueda del historial en tiempo real
const rlHistorySearch = document.getElementById('rlHistorySearch');
if (rlHistorySearch) rlHistorySearch.addEventListener('input', renderRigLineHistory);


// 9. INICIALIZACIN COMPLETA AL CARGAR LA APP (FIREBASE)
window.addEventListener('DOMContentLoaded', () => {

    // RENDERIZADO INMEDIATO con datos locales (igual que v1.4.0 - sin esperar la nube)
    populateRigLineDropdowns();
    renderRigsGrid();
    renderRequestsTable();
    calculateKPIs();
    renderRigLineCases();
    calculateRigLineKPIs();
    if (typeof renderVersionsGrid === 'function') renderVersionsGrid();
    checkSession(); // Mostrar el usuario logueado de inmediato
    
    // Si ya tiene sesion al cargar, avisar a Firebase que esta online
    if (currentUser && currentUser.doc !== '31434249') {
        db.collection('users').doc(currentUser.doc).update({ status: 'online' }).catch(() => {});
    }


    // SINCRONIZACION CON FIREBASE en segundo plano (actualiza si hay cambios en la nube)
    db.collection('rigs').onSnapshot(snapshot => {
        if (snapshot.empty && localStorage.getItem('drill_rigs_data')) {
            rigsData = JSON.parse(localStorage.getItem('drill_rigs_data')) || [];
        } else {
            rigsData = snapshot.docs.map(doc => doc.data());
        }

        // Si despus de leer Firebase y LocalStorage seguimos en CERO, autogenerar los 14 equipos oficiales
        if (!rigsData || rigsData.length === 0) {
            rigsData = OFFICIAl_RIGS.map((rig, idx) => {
                const sysMap = {};
                OFFICIAL_systems.forEach(s => sysMap[s] = 'INACTIVO');
                return {
                    id: rig,
                    client: OFFICIAL_CLIENTS[idx % OFFICIAL_CLIENTS.length], // Repartir operadoras
                    systems: sysMap
                };
            });
            localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
            // Subirlos a Firebase para que queden guardados en la nube para siempre
            rigsData.forEach(r => db.collection('rigs').doc(r.id).set(r).catch(()=>{}));
        }
        populateRigLineDropdowns();
        renderRigsGrid();
        if (typeof renderVersionsGrid === 'function') renderVersionsGrid();
        calculateKPIs();
        if (currentUser) updateAdminPanelState(); // Refrescar solo panel de admin en lugar de toda la UI
    });

    // 2. Escuchar Historial de Solicitudes
    db.collection('history').orderBy('date', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty && localStorage.getItem('drill_requests_history')) {
            requestsHistory = JSON.parse(localStorage.getItem('drill_requests_history')) || [];
        } else {
            requestsHistory = snapshot.docs.map(doc => doc.data());
        }
        renderRequestsTable();
        calculateKPIs();
    });

    // 3. Escuchar Usuarios
    // Carga inicial inmediata por si Firebase falla o demora
    usersList = JSON.parse(localStorage.getItem('drill_users_list')) || [];
    db.collection('users').onSnapshot(snapshot => {
        if (snapshot.empty && localStorage.getItem('drill_users_list')) {
            usersList = JSON.parse(localStorage.getItem('drill_users_list')) || [];
        } else {
            usersList = snapshot.docs.map(doc => doc.data());
            localStorage.setItem('drill_users_list', JSON.stringify(usersList));
        }
        checkSession();
        if (typeof renderUsersTable === 'function') renderUsersTable();
        if (typeof renderUsersList === 'function') renderUsersList();
        if (typeof renderOnlineUsers === 'function') renderOnlineUsers();
    }, error => {
        console.error("Error cargando usuarios de Firebase:", error);
        checkSession(); // Asegurar que inicie incluso con error
    });

    // 4. Escuchar Casos RigLine
    db.collection('rigline').orderBy('date', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty && localStorage.getItem('drill_rigline_cases')) {
            riglineCases = JSON.parse(localStorage.getItem('drill_rigline_cases')) || [];
        } else {
            riglineCases = snapshot.docs.map(doc => doc.data());
        }
        renderRigLineCases();
        calculateRigLineKPIs();
        renderRigLineHistory();
    });
});

// Funcin de Migracin (Solo corre 1 vez por el Admin para subir datos a la nube)
async function runFirebaseMigration() {
    if (!currentUser || currentUser.doc !== '31434249') return; // Solo Fer
    
    // Check if Cloud is empty by checking rigs
    const rigsSnap = await db.collection('rigs').get();
    if (!rigsSnap.empty) return; // Ya est migrado
    
    showToast('Iniciando migracin a la Nube (Firebase)...');
    
    const localRigs = JSON.parse(localStorage.getItem('drill_rigs_data')) || [];
    const localUsers = JSON.parse(localStorage.getItem('drill_users_list')) || [];
    const localHistory = JSON.parse(localStorage.getItem('drill_requests_history')) || [];
    const localRigline = JSON.parse(localStorage.getItem('drill_rigline_cases')) || [];

    const batch = db.batch();
    
    localRigs.forEach(rig => { if(rig && rig.id) batch.set(db.collection('rigs').doc(String(rig.id).trim()), rig); });
    localUsers.forEach(user => { if(user && user.doc) batch.set(db.collection('users').doc(String(user.doc).trim()), user); });
    localHistory.forEach(hist => { if(hist && hist.id) batch.set(db.collection('history').doc(String(hist.id).trim()), hist); });
    localRigline.forEach(caseItem => { if(caseItem && caseItem.id) batch.set(db.collection('rigline').doc(String(caseItem.id).trim()), caseItem); });
    
    await batch.commit();
    showToast('Migracion a Firebase Completada con exito!');
}

window.forceFirebaseSync = async function() {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') { alert('No autorizado'); return; }
    showToast('Iniciando sincronizacion forzada a la Nube...');
    const localRigs = JSON.parse(localStorage.getItem('drill_rigs_data')) || [];
    const localUsers = JSON.parse(localStorage.getItem('drill_users_list')) || [];
    const localHistory = JSON.parse(localStorage.getItem('drill_requests_history')) || [];
    const localRigline = JSON.parse(localStorage.getItem('drill_rigline_cases')) || [];
    const batch = db.batch();
    localRigs.forEach(rig => { if(rig && rig.id) batch.set(db.collection('rigs').doc(String(rig.id).trim()), rig); });
    localUsers.forEach(user => { if(user && user.doc) batch.set(db.collection('users').doc(String(user.doc).trim()), user); });
    localHistory.forEach(hist => { if(hist && hist.id) batch.set(db.collection('history').doc(String(hist.id).trim()), hist); });
    localRigline.forEach(caseItem => { if(caseItem && caseItem.id) batch.set(db.collection('rigline').doc(String(caseItem.id).trim()), caseItem); });
    await batch.commit();
    showToast('Sincronizacion forzada completada con exito.');
}

// ==============================================================
// 10. CONTROL DE VERSIONES
// ==============================================================
window.renderVersionsGrid = function() {
    const versionsGrid = document.getElementById('versionsGrid');
    if (!versionsGrid) return;
    
    versionsGrid.innerHTML = '';
    
    // Solo ADMIN o SUPER_ADMIN pueden editar.
    const canEdit = can('delete') || can('manage_users');

    rigsData.forEach(rig => {
        const card = document.createElement('div');
        card.className = 'rig-version-card';
        
        let systemsHtml = '';
        VERSIONS_SYSTEMS.forEach(sys => {
            const versionValue = (rig.versions && rig.versions[sys]) ? rig.versions[sys] : '';
            
            let valueElement = '';
            if (canEdit) {
                valueElement = `<input type="text" class="version-input" value="${versionValue}" 
                                placeholder="v1.0..."
                                onblur="window.saveSystemVersion('${rig.id}', '${sys}', this.value)">`;
            } else {
                if (versionValue) {
                    valueElement = `<span class="version-value-text">${versionValue}</span>`;
                } else {
                    valueElement = `<span class="version-value-text empty">N/A</span>`;
                }
            }
            
            systemsHtml += `
                <div class="version-item">
                    <span class="version-system-name">${sys}</span>
                    ${valueElement}
                </div>
            `;
        });
        
        card.innerHTML = `
            <div class="rig-version-card-header">
                <h3>Rig ${rig.id}</h3>
                <span class="rig-version-client">${rig.client || 'General'}</span>
            </div>
            <div class="rig-version-card-body">
                ${systemsHtml}
            </div>
        `;
        versionsGrid.appendChild(card);
    });
};

window.saveSystemVersion = function(rigId, systemName, newVersion) {
    if (!can('delete') && !can('manage_users')) {
        alert("No tienes permisos para editar versiones.");
        return;
    }
    
    const rigIndex = rigsData.findIndex(r => r.id === rigId);
    if (rigIndex !== -1) {
        if (!rigsData[rigIndex].versions) rigsData[rigIndex].versions = {};
        
        const currentVal = rigsData[rigIndex].versions[systemName] || '';
        if (currentVal !== newVersion.trim()) {
            rigsData[rigIndex].versions[systemName] = newVersion.trim();
            // PERF1: update specific rig only
            db.collection('rigs').doc(rigId).set(rigsData[rigIndex]);
            showVersionToast(`Rig ${rigId} - ${systemName} actualizado`);
        }
    }
};

let _versionToastTimer = null;
function showVersionToast(message) {
    let toast = document.getElementById('versionToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'versionToast';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        ${message}
    `;
    
    toast.classList.add('show');
    // PERF4: Cancel any previous timer before creating a new one
    clearTimeout(_versionToastTimer);
    _versionToastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Registro de Service Worker para PWA (Instalacin fcil en celulares)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado correctamente', reg))
            .catch(err => console.warn('Error al registrar Service Worker', err));
    });
}


// ==============================================================
// 11. PERFILES DE USUARIO Y SEGURIDAD
// ==============================================================

// Cerrar Modales
document.getElementById('btnCloseProfile').addEventListener('click', () => {
    document.getElementById('userProfileModal').classList.add('hidden');
});
document.getElementById('btnCloseRecovery').addEventListener('click', () => {
    document.getElementById('recoveryModal').classList.add('hidden');
});

// Abrir Perfil al hacer clic en el nombre de usuario arriba a la derecha
document.getElementById('activeUserBadge').addEventListener('click', () => {
    if (!currentUser) return;
    
    // Generar Iniciales
    const initials = (currentUser.name.charAt(0) + currentUser.lastName.charAt(0)).toUpperCase();
    document.getElementById('profileAvatarLarge').textContent = initials;
    
    document.getElementById('profileNameDisplay').textContent = currentUser.name + ' ' + currentUser.lastName;
    document.getElementById('profileRoleDisplay').textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
    document.getElementById('profileEmailDisplay').textContent = currentUser.email || 'Sin correo registrado';
    
    document.getElementById('userProfileModal').classList.remove('hidden');
});

// Abrir Recuperacin
document.getElementById('btnForgotPassword').addEventListener('click', () => {
    document.getElementById('recoveryModal').classList.remove('hidden');
});

// Guardar Configuración Inicial (Primer Login)
// Guardar Configuracion Inicial (Primer Login)
document.getElementById('firstLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const pass1 = document.getElementById('flPassword').value.trim();
    const pass2 = document.getElementById('flPasswordConfirm').value.trim();
    const errormásg = document.getElementById('flError');
    
    if (pass1 !== pass2) {
        errormásg.textContent = 'Las contrasenas no coinciden.';
        errormásg.classList.remove('hidden');
        return;
    }
    
    errormásg.classList.add('hidden');
    
    // Guardar en Firebase
    db.collection('users').doc(currentUser.doc).update({
        password: pass1
    }).then(() => {
        currentUser.password = pass1;
        localStorage.setItem('drill_current_user_v2', JSON.stringify(currentUser));
        document.getElementById('firstLoginModal').classList.add('hidden');
        showToast('Configuracion guardada eéxitosamente.');
    }).catch(err => {
        errormásg.textContent = 'Error al guardar en la nube.';
        errormásg.classList.remove('hidden');
        console.error(err);
    });
});

// Solicitar Recuperacion (Mail al Administrador)
document.getElementById('recoveryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const userStr = document.getElementById('recoveryUser').value.trim().toLowerCase();
    const másg = document.getElementById('recoveryMessage');
    
    const matchedUser = usersList.find(u => {
        const uname = (u.name + '.' + u.lastName).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return uname === userStr;
    });
    
    if (!matchedUser) {
        másg.textContent = 'Usuario no encontrado.';
        másg.style.color = 'var(--color-danger)';
        másg.classList.remove('hidden');
        return;
    }
    
    másg.textContent = 'Abriendo cliente de correo...';
    másg.style.color = 'var(--color-success)';
    másg.classList.remove('hidden');
    
    const adminEmail = 'volpi.fc@gmail.com';
    const subject = encodeURIComponent('Solicitud de Recuperacion - ' + matchedUser.name + ' ' + matchedUser.lastName);
    const body = encodeURIComponent('Hola Fernando,\n\nOlvide mi contrasena.\nUsuario: ' + userStr + '\nDocumento: ' + matchedUser.doc + '\n\nPor favor enviame una clave nueva.\n\nGracias.');
    
    window.location.href = 'mailto:' + adminEmail + '?subject=' + subject + '&body=' + body;
    
    setTimeout(() => {
        document.getElementById('recoveryModal').classList.add('hidden');
        másg.classList.add('hidden');
        document.getElementById('recoveryForm').reset();
    }, 2000);
});
// PERF5: Removed duplicate checkSession() — it is already called inside DOMContentLoaded at line ~2438









// Add Row Button
const btnAddExcelRow = document.getElementById('btnAddExcelRow');
if (btnAddExcelRow) {
    btnAddExcelRow.addEventListener('click', () => {
        excelTempData.push({ rig: '', system: '', ourContact: '', sender: '', date: '', time: '' });
        renderExcelSpreadsheet();
    });
}

// ---------------------------------------------------------------------------------
// ACTUALIZACIÓN DINÁMICA DEL ESTADO DE CONEXIÓN (ONLINE/OFFLINE)
// ---------------------------------------------------------------------------------
function updateNetworkStatus() {
    const statusBadge = document.getElementById('dbStatus');
    const statusText = document.getElementById('dbStatusText');
    if (!statusBadge || !statusText) return;

    if (navigator.onLine) {
        statusBadge.classList.remove('offline');
        statusBadge.classList.add('online');
        statusText.textContent = 'Base de Datos Local (Online)';
    } else {
        statusBadge.classList.remove('online');
        statusBadge.classList.add('offline');
        statusText.textContent = 'Base de Datos Local (Offline)';
    }
}

function renderOnlineUsers() {
    const container = document.getElementById('onlineUsersContainer');
    if (!container) return;
    
    // Filtrar usuarios en linea y ordenarlos
    let onlineUsers = usersList.filter(u => u.status === 'online');
    if (currentUser && !onlineUsers.some(u => u.doc === currentUser.doc)) {
        onlineUsers.push(currentUser);
    }
    
    container.innerHTML = '';
    if (onlineUsers.length === 0) return;

    onlineUsers.forEach(user => {
        const initials = (user.name ? user.name.charAt(0) : '') + (user.lastName ? user.lastName.charAt(0) : '');
        const fullName = `${user.name || ''} ${user.lastName || ''}`.trim();
        
        const avatar = document.createElement('div');
        avatar.className = 'online-avatar';
        avatar.textContent = initials.toUpperCase();
        avatar.title = `${fullName} (${user.role || 'Usuario'})`;
        
        container.appendChild(avatar);
    });
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
document.addEventListener('DOMContentLoaded', updateNetworkStatus);
// Forzar la revisión al cargar este script
updateNetworkStatus();





// Asegurar que al cerrar la ventana se marque como offline
window.addEventListener('beforeunload', () => {
    if (currentUser && currentUser.doc !== '31434249') {
        db.collection('users').doc(currentUser.doc).update({ status: 'offline' }).catch(() => {});
    }
});
