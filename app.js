// DRILL CONTROL SYSTEM v1.4.0 — PWA Release
// Lógica de Negocio y Base de Datos (Offline por defecto con LocalStorage)

// 1. ESTRUCTURAS DE DATOS INICIALES (Listados oficiales)
const OFFICIAl_RIGS = ["F03", "F07", "F35", "M1211", "990", "F10", "F19", "F24", "F34", "F37", "991", "F15", "F26", "F36"];
const OFFICIAL_CLIENTS = ["YPF", "Tecpetrol", "Vista Energy", "TOTAL Energy", "Phoenix", "Geopark"];
const OFFICIAL_SYSTEMS = ["REVit", "SmartDrill", "SmartSlide", "SmartNav", "AutoDownlinks", "Predictive Drilling", "Operador"];

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
    SOLICITADO_MAIL: "Solicitado vía Mail (Eventual)"
};

// ─── SISTEMA DE ROLES Y PERMISOS ──────────────────────────────────────────────────
const ROLES = {
    VIEWER:      'VIEWER',      // Solo visualización
    REPORTER:    'REPORTER',    // Ver + Cargar casos
    RESOLVER:    'RESOLVER',    // Ver + Cargar + Cerrar
    ADMIN:       'ADMIN',       // Ver + Cargar + Cerrar + Editar + Borrar
    SUPER_ADMIN: 'SUPER_ADMIN'  // Todo + Gestión de usuarios y roles
};

const ROLE_LABELS = {
    VIEWER:      'Solo Lectura',
    REPORTER:    'Cargador',
    RESOLVER:    'Operador',
    ADMIN:       'Administrador',
    SUPER_ADMIN: 'Super Admin ★'
};

const ROLE_ORDER = ['VIEWER', 'REPORTER', 'RESOLVER', 'ADMIN', 'SUPER_ADMIN'];
const SUPER_ADMIN_DOC = '31434249'; // Fernando Volpi — Super Admin principal inmutable

// 2. INICIALIZACIÓN DE LA BASE DE DATOS LOCAL (Si no existe en el navegador)
let rigsData = JSON.parse(localStorage.getItem('drill_rigs_data'));
let requestsHistory = JSON.parse(localStorage.getItem('drill_requests_history'));
let usersList = JSON.parse(localStorage.getItem('drill_users_list'));
let currentUser = JSON.parse(localStorage.getItem('drill_current_user')) || null;
let riglineCases = JSON.parse(localStorage.getItem('drill_rigline_cases'));

// Migración automática de datos para la versión v1.5.0 / v1.3.0 (Sistemas y Versiones)
if (rigsData && rigsData.length > 0) {
    let migrated = false;
    rigsData.forEach(rig => {
        if (!rig.systems) { rig.systems = {}; migrated = true; }
        if (!rig.versions) { rig.versions = {}; migrated = true; }
        
        OFFICIAL_SYSTEMS.forEach(sys => {
            if (rig.systems[sys] === undefined) {
                rig.systems[sys] = MODALITIES.INACTIVO;
                migrated = true;
            }
            if (rig.versions[sys] === undefined) {
                rig.versions[sys] = "";
                migrated = true;
            }
        });
    });
    if (migrated) {
        localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
    }
}

// Semilla de Datos de Ejemplo (Para que la app no empiece vacía en la primera ejecución)
if (!rigsData || rigsData.length === 0) {
    rigsData = OFFICIAl_RIGS.map(rig => {
        // Asignamos clientes de forma predeterminada para ver el panel poblado
        let client = "";
        if (["F03", "F07", "F10"].includes(rig)) client = "YPF";
        else if (["M1211", "990"].includes(rig)) client = "Vista Energy";
        else if (["F24", "F34"].includes(rig)) client = "Tecpetrol";
        else if (["F15", "F36"].includes(rig)) client = "TOTAL Energy";
        else if (["F19"].includes(rig)) client = "Phoenix";
        else if (["F37"].includes(rig)) client = "Geopark";
        else client = "YPF"; // Default

        // Creamos el estado inicial inactivo para todos los sistemas y vacío para versiones
        let systems = {};
        let versions = {};
        OFFICIAL_SYSTEMS.forEach(sys => {
            systems[sys] = MODALITIES.INACTIVO;
            versions[sys] = "";
        });

        // Agregamos algunos sistemas activos de ejemplo
        if (rig === "F03") {
            systems["REVit"] = MODALITIES.CONTRATO;
            systems["SmartDrill"] = MODALITIES.SOLICITADO_CON_OP;
        } else if (rig === "M1211") {
            systems["SmartSlide"] = MODALITIES.SOLICITADO_SIN_OP;
            systems["SmartNav"] = MODALITIES.CONTRATO;
        } else if (rig === "F15") {
            systems["Predictive Drilling"] = MODALITIES.CONTRATO;
        }

        return { id: rig, client: client, systems: systems, versions: versions };
    });
    localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
}

if (!requestsHistory || requestsHistory.length === 0) {
    requestsHistory = [
        { id: "1", rig: "F03", client: "YPF", system: "REVit", modality: MODALITIES.CONTRATO, date: new Date().toISOString() },
        { id: "2", rig: "F03", client: "YPF", system: "SmartDrill", modality: MODALITIES.SOLICITADO_CON_OP, date: new Date().toISOString() },
        { id: "3", rig: "M1211", client: "Vista Energy", system: "SmartSlide", modality: MODALITIES.SOLICITADO_SIN_OP, date: new Date().toISOString() },
        { id: "4", rig: "M1211", client: "Vista Energy", system: "SmartNav", modality: MODALITIES.CONTRATO, date: new Date().toISOString() },
        { id: "5", rig: "F15", client: "TOTAL Energy", system: "Predictive Drilling", modality: MODALITIES.CONTRATO, date: new Date().toISOString() }
    ];
    localStorage.setItem('drill_requests_history', JSON.stringify(requestsHistory));
}

// Seed inicial: Fernando Volpi (Super Admin) + usuarios de prueba
if (!usersList || usersList.length === 0) {
    usersList = [
        { name: "Fernando", lastName: "Volpi",      doc: "31434249", role: "SUPER_ADMIN" },
        { name: "Admin",    lastName: "Operaciones", doc: "1111",     role: "VIEWER"      },
        { name: "Juan",     lastName: "Pérez",       doc: "12345678", role: "RESOLVER"    }
    ];
    localStorage.setItem('drill_users_list', JSON.stringify(usersList));
}

// Migración automática: agregar campo 'role' a usuarios sin él
let _usersMigrated = false;
usersList = usersList.map(u => {
    if (!u.role) {
        _usersMigrated = true;
        if (u.doc === SUPER_ADMIN_DOC) return { ...u, role: 'SUPER_ADMIN' };
        if (u.doc === '1111')          return { ...u, role: 'VIEWER' };
        return { ...u, role: 'RESOLVER' };
    }
    // Forzar migración del usuario 1111 a VIEWER (Solo mirar)
    if (u.doc === '1111' && u.role === 'ADMIN') {
        _usersMigrated = true;
        return { ...u, role: 'VIEWER' };
    }
    return u;
});
// Garantizar que Fernando Volpi siempre exista como SUPER_ADMIN
if (!usersList.find(u => u.doc === SUPER_ADMIN_DOC)) {
    usersList.unshift({ name: "Fernando", lastName: "Volpi", doc: SUPER_ADMIN_DOC, role: "SUPER_ADMIN" });
    _usersMigrated = true;
}
// Proteger su rol: no puede ser degradado por nadie
usersList = usersList.map(u => u.doc === SUPER_ADMIN_DOC ? { ...u, role: 'SUPER_ADMIN' } : u);
if (_usersMigrated) localStorage.setItem('drill_users_list', JSON.stringify(usersList));

// Sincronizar currentUser con los datos frescos (rol pudo haber cambiado)
if (currentUser) {
    const _freshUser = usersList.find(u => u.doc === currentUser.doc);
    if (_freshUser) {
        currentUser = _freshUser;
        localStorage.setItem('drill_current_user', JSON.stringify(currentUser));
    } else {
        // Usuario fue eliminado — cerrar sesión automáticamente
        currentUser = null;
        localStorage.removeItem('drill_current_user');
    }
}

if (!riglineCases || riglineCases.length === 0) {
    riglineCases = [
        {
            id: "RL-8421",
            rig: "F03",
            system: "REVit",
            priority: "Alta",
            reporter: "Carlos Gómez",
            description: "Caída completa de la telemetría REVit. Falla física en el enlace de fibra óptica de la cabina de perforación.",
            status: "PENDIENTE",
            date: new Date(Date.now() - 3600000 * 4).toISOString() // 4 hours ago
        },
        {
            id: "RL-3195",
            rig: "M1211",
            system: "SmartDrill",
            priority: "Media",
            reporter: "Enzo Rodríguez",
            description: "Falla intermitente en sensor de torque en mesa rotaria. Lecturas erráticas durante la perforación del tramo de 12 1/4\".",
            status: "PENDIENTE",
            date: new Date(Date.now() - 3600000 * 12).toISOString() // 12 hours ago
        },
        {
            id: "RL-7052",
            rig: "F15",
            system: "Hardware / Conectividad",
            priority: "Baja",
            reporter: "Marcos Soler",
            description: "Teclado industrial de la cabina dañado por salpicadura de lodo de perforación. Teclas atascadas.",
            status: "PENDIENTE",
            date: new Date(Date.now() - 3600000 * 24).toISOString() // 24 hours ago
        },
        {
            id: "RL-1084",
            rig: "F07",
            system: "SmartNav",
            priority: "Media",
            reporter: "Silvia López",
            description: "Error de calibración en la sonda direccional al reiniciar el sistema SmartNav.",
            status: "RESUELTO",
            resolver: "Juan Pérez",
            date: new Date(Date.now() - 3600000 * 48).toISOString(), // 48 hours ago
            closedDate: new Date(Date.now() - 3600000 * 46).toISOString()
        }
    ];
    localStorage.setItem('drill_rigline_cases', JSON.stringify(riglineCases));
}

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
const adminProfile = document.getElementById('adminProfile');
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

// Pestañas Laterales
const tabRequests = document.getElementById('tabRequests');
const tabUsers = document.getElementById('tabUsers');
const tabAdminActions = document.getElementById('tabAdminActions');
const contentRequests = document.getElementById('contentRequests');
const contentUsers = document.getElementById('contentUsers');
const contentAdminActions = document.getElementById('contentAdminActions');

// Formularios y Asignación Rápida
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
const rlSystemSelect = document.getElementById('rlSystemSelect');
const rlPrioritySelect = document.getElementById('rlPrioritySelect');
const rlReporterName = document.getElementById('rlReporterName');
const rlDescription = document.getElementById('rlDescription');
const rlReportForm = document.getElementById('rlReportForm');
const riglineActiveCasesBadge = document.getElementById('riglineActiveCasesBadge');
const rlCaseIdInput = document.getElementById('rlCaseIdInput');
const rlFilterStatus = document.getElementById('rlFilterStatus');


const kpiRlPending = document.getElementById('kpiRlPending');
const kpiRlHigh = document.getElementById('kpiRlHigh');
const kpiRlMostAffected = document.getElementById('kpiRlMostAffected');
const kpiRlClosedCount = document.getElementById('kpiRlClosedCount');

// 4. FUNCIONES DE RENDERIZACIÓN DE LA INTERFAZ

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
            const titleTooltip = hasHighPriority ? '¡Estado Crítico! Caso técnico de prioridad alta activo en RigLine.' : 'Advertencia: Falla técnica activa en RigLine.';
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
        OFFICIAL_SYSTEMS.forEach(sys => {
            const statusClass = `status-${rig.systems[sys]}`;
            const label = sys;
            const dot = `<span class="dot"></span>`;
            const statusLabel = rig.systems[sys] === MODALITIES.INACTIVO ? 'Inactivo' :
                          rig.systems[sys] === MODALITIES.CONTRATO ? 'Activo' :
                          rig.systems[sys] === MODALITIES.SOLICITADO_CON_OP ? 'Con Op.' :
                          rig.systems[sys] === MODALITIES.SOLICITADO_SIN_OP ? 'Sin Op.' : 'Vía Mail';
            
            systemsHtml += `
                <div class="rig-system-item">
                    <span class="system-name">${label}</span>
                    <span class="system-status-dot-label ${statusClass}">
                        ${dot} ${statusLabel}
                    </span>
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


// Renderiza el configurador de sistemas en el formulario
function renderSystemsConfigForm(rigId) {
    systemsConfigList.innerHTML = '';
    const rigObj = rigsData.find(r => r.id === rigId);
    if (!rigObj) return;
    
    OFFICIAL_SYSTEMS.forEach(sys => {
        const currentModality = rigObj.systems[sys] || MODALITIES.INACTIVO;
        const isContract = currentModality === MODALITIES.CONTRATO;
        
        let mailValue = 'INACTIVO';
        if (currentModality === MODALITIES.SOLICITADO_MAIL ||
            currentModality === MODALITIES.SOLICITADO_CON_OP ||
            currentModality === MODALITIES.SOLICITADO_SIN_OP) {
            mailValue = 'SOLICITADO_MAIL';
        }

        const row = document.createElement('div');
        row.className = 'system-config-row';
        row.innerHTML = `
            <span class="sys-name-label">${sys}</span>
            <label class="checkbox-label">
                <input type="checkbox" class="sys-contract-check" data-system="${sys}" ${isContract ? 'checked' : ''}>
                Contrato
            </label>
            <select class="select-mail-status" data-system="${sys}" ${isContract ? 'disabled' : ''}>
                <option value="INACTIVO" ${mailValue === 'INACTIVO' ? 'selected' : ''}>Inactivo</option>
                <option value="SOLICITADO_MAIL" ${mailValue === 'SOLICITADO_MAIL' ? 'selected' : ''}>Solicitado vía Mail (Eventual)</option>
            </select>
        `;

        const check = row.querySelector('.sys-contract-check');
        const select = row.querySelector('.select-mail-status');
        
        check.addEventListener('change', () => {
            if (check.checked) {
                select.value = 'INACTIVO';
                select.disabled = true;
            } else {
                select.disabled = false;
            }
        });

        systemsConfigList.appendChild(row);
    });
}

// Selecciona un equipo y actualiza la sección de carga/formulario
function selectRigCard(rigId) {
    selectedRigCardId = rigId;
    
    // Resaltar tarjeta seleccionada
    document.querySelectorAll('.rig-card').forEach(c => {
        c.classList.remove('active-card');
        if (c.getAttribute('data-id') === rigId) {
            c.classList.add('active-card');
        }
    });

    // Si somos editores, actualizamos el estado de administración y cargamos sistemas
    if (currentUser) {
        updateAdminPanelState();
        renderSystemsConfigForm(rigId);
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

    if (!showAllHistory && totalCount > 15) {
        slicedRequests = filteredRequests.slice(0, 15);
        hasLimitApplied = true;
    }

    // Inyectar filas en la tabla
    if (totalCount === 0) {
        requestsTableBody.innerHTML = `
            <tr>
                <td colspan="${currentUser ? '5' : '4'}" style="text-align: center; color: var(--text-muted); padding: 30px;">
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

        if (req.system === "REASIGNACIÓN") {
            if (req.modality === "Sin Contrato") {
                statusLabel = "Sin Contrato / Liberado";
                statusClass = 'status-INACTIVO'; // Gris pizarra
            } else {
                statusLabel = `Asignado a ${req.modality}`;
                statusClass = 'status-CONTRATO'; // Verde cian
            }
        }

        let deleteBtnHtml = '';
        if (currentUser) {
            deleteBtnHtml = `
                <td>
                    <button class="btn btn-danger-icon" onclick="deleteRequest('${req.id}')" title="Eliminar Registro">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            `;
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
                detailsSubtextHtml = `<span class="request-details-subtext">Vía: ${req.sender} (Previo: ${req.ourContact}) el ${formattedDateStr}</span>`;
            } else {
                detailsSubtextHtml = `<span class="request-details-subtext">Vía: ${req.sender} el ${formattedDateStr}</span>`;
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
            ${deleteBtnHtml}
        `;
        requestsTableBody.appendChild(tr);
    });

    if (hasLimitApplied) {
        const infoTr = document.createElement('tr');
        infoTr.innerHTML = `
            <td colspan="${currentUser ? '5' : '4'}" style="text-align: center; color: var(--color-cyan); padding: 10px; font-size: 0.72rem; font-style: italic; background: rgba(0, 210, 255, 0.02); border-top: 1px dashed rgba(0, 210, 255, 0.15);">
                Mostrando los 15 registros más recientes de ${totalCount}. Tilda "Mostrar todo el historial" arriba para ver todo.
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

    rigsData.forEach(rig => {
        OFFICIAL_SYSTEMS.forEach(sys => {
            const mod = rig.systems[sys];
            if (mod !== MODALITIES.INACTIVO) {
                if (mod === MODALITIES.CONTRATO) {
                    activeContractCount++;
                } else if (mod === MODALITIES.SOLICITADO_MAIL || 
                           mod === MODALITIES.SOLICITADO_CON_OP || 
                           mod === MODALITIES.SOLICITADO_SIN_OP) {
                    requestedMailCount++;
                }
            }
        });
    });

    kpiActiveServices.textContent = activeContractCount;
    kpiRequestedServices.textContent = requestedMailCount;

    // Calcular cantidad de pozos activos en el Hero Banner (con al menos un sistema operativo)
    let activeRigsWithSystems = 0;
    rigsData.forEach(rig => {
        let hasActive = false;
        OFFICIAL_SYSTEMS.forEach(sys => {
            if (rig.systems[sys] !== MODALITIES.INACTIVO) {
                hasActive = true;
            }
        });
        if (hasActive) activeRigsWithSystems++;
    });
    const heroActiveRigsCount = document.getElementById('heroActiveRigsCount');
    if (heroActiveRigsCount) {
        heroActiveRigsCount.textContent = activeRigsWithSystems;
    }

    // Calcular Tasa con Operador Técnico (Porcentaje de Rigs activos con Operador asignado)
    let activeRigsCount = 0;
    let rigsWithOperatorCount = 0;

    rigsData.forEach(rig => {
        let hasActiveAutomation = false;
        let hasOperator = false;

        OFFICIAL_SYSTEMS.forEach(sys => {
            const mod = rig.systems[sys];
            if (mod !== MODALITIES.INACTIVO) {
                if (sys !== "Operador") {
                    hasActiveAutomation = true;
                }
                if (sys === "Operador") {
                    hasOperator = true;
                }
                if (mod === MODALITIES.SOLICITADO_CON_OP) {
                    hasOperator = true;
                }
            }
        });

        if (hasActiveAutomation) {
            activeRigsCount++;
            if (hasOperator) {
                rigsWithOperatorCount++;
            }
        }
    });

    const rate = activeRigsCount > 0 ? Math.round((rigsWithOperatorCount / activeRigsCount) * 100) : 0;
    kpiOperatorRate.textContent = `${rate}%`;
}

// 6. GESTIÓN DE SESIÓN, PERMISOS Y LOGIN

// Verifica si el usuario actual tiene permiso para una acción específica
function can(action) {
    if (!currentUser) return false;
    const role = currentUser.role || 'VIEWER';
    const perms = {
        view:         ['VIEWER', 'REPORTER', 'RESOLVER', 'ADMIN', 'SUPER_ADMIN'],
        report:       ['REPORTER', 'RESOLVER', 'ADMIN', 'SUPER_ADMIN'],
        resolve:      ['RESOLVER', 'ADMIN', 'SUPER_ADMIN'],
        delete:       ['ADMIN', 'SUPER_ADMIN'],
        manage_users: ['SUPER_ADMIN'],
    };
    return (perms[action] || []).includes(role);
}

// Comprobar la sesión al cargar y actualizar la UI según el rol
function checkSession() {
    if (currentUser) {
        updateUIByRole();
    } else {
        authScreen.classList.remove('hidden');
        appContainer.style.display = 'none';
    }
}

// Actualiza toda la interfaz según el rol del usuario autenticado
function updateUIByRole() {
    if (!currentUser) {
        authScreen.classList.remove('hidden');
        appContainer.style.display = 'none';
        return;
    }
    
    authScreen.classList.add('hidden');
    appContainer.style.display = 'block';

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

    // Tab Administración: visible para REPORTER+
    if (can('report')) {
        tabAdminActions.classList.remove('hidden');
    } else {
        tabAdminActions.classList.add('hidden');
        if (contentAdminActions && !contentAdminActions.classList.contains('hidden')) {
            switchTab('tabRequests');
        }
    }

    // Panel Usuarios: SOLO SUPER_ADMIN puede ver y gestionar
    if (can('manage_users')) {
        usersPanelNoAccess.classList.add('hidden');
        createUserFormWrapper.classList.remove('hidden');
        usersListWrapper.classList.remove('hidden');
        renderUsersList();
    } else {
        usersPanelNoAccess.classList.remove('hidden');
        createUserFormWrapper.classList.add('hidden');
        usersListWrapper.classList.add('hidden');
    }

    // Botones eliminar en solicitudes: ADMIN+
    if (can('delete')) {
        document.querySelectorAll('.actions-header').forEach(el => el.classList.remove('hidden'));
        if (btnClearHistory) btnClearHistory.classList.remove('hidden');
    } else {
        document.querySelectorAll('.actions-header').forEach(el => el.classList.add('hidden'));
        if (btnClearHistory) btnClearHistory.classList.add('hidden');
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



// Actualiza el estado del formulario de reporte RigLine según permisos del usuario
function updateRLFormByRole() {
    if (!rlReportForm) return;
    // Eliminar lock msg anterior
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
                        ? `Tu rol actual es <strong style="color:var(--color-amber);">${roleLabel}</strong>. Necesitás permisos de <strong>Cargador</strong> o superior.`
                        : 'Iniciá sesión con permisos de <strong>Cargador</strong> o superior para reportar casos.'
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
        // Pre-llenar el nombre del reportante con el usuario logueado (read-only)
        if (rlReporterName && currentUser) {
            rlReporterName.value = `${currentUser.name} ${currentUser.lastName}`;
            rlReporterName.readOnly = true;
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
    
    // Estado inicial / Ningún rig seleccionado
    if (selectedRigDisplay) {
        selectedRigDisplay.textContent = "Ningún equipo seleccionado (Selecciona uno a la izquierda)";
        selectedRigDisplay.classList.remove('active-glow');
    }
    buttons.forEach(btn => btn.classList.remove('active'));
    if (systemsConfigList) {
        systemsConfigList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">Selecciona un equipo de perforación de la izquierda para configurar sus sistemas.</div>';
    }
}

// Cambiar de Pestaña en el Panel Derecho
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

// Renderiza la lista de usuarios con badges de rol y controles de gestión (SUPER_ADMIN)
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
        const roleOptionsHtml = ROLE_ORDER.map(r =>
            `<option value="${r}" ${role === r ? 'selected' : ''}>${ROLE_LABELS[r]}</option>`
        ).join('');
        let actionsHtml = '';
        if (isSuperAdmin && !isMe) {
            if (isMainSA) {
                actionsHtml = `<span class="role-badge role-super_admin" style="font-size:0.6rem;padding:2px 5px;">★ Protegido</span>`;
            } else {
                actionsHtml = `
                    <div style="display:flex;gap:6px;align-items:center;">
                        <select class="role-select-inline" onchange="window.changeUserRole('${u.doc}', this.value)" title="Cambiar nivel de permiso">
                            ${roleOptionsHtml}
                        </select>
                        <button class="btn btn-danger-icon" onclick="window.deleteUser('${u.doc}')" style="padding:4px 7px;" title="Eliminar usuario">✕</button>
                    </div>`;
            }
        } else if (isMe) {
            actionsHtml = `<span style="font-size:0.68rem;color:var(--color-cyan);opacity:0.8;">(Vos)</span>`;
        }
        li.innerHTML = `
            <div class="user-item-info">
                <span class="user-item-name">${u.name} ${u.lastName}${isMainSA ? ' ★' : ''}</span>
                <span class="user-item-pass">Doc: ${u.doc}</span>
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
        localStorage.setItem('drill_users_list', JSON.stringify(usersList));
        renderUsersList();
    }
};

// 7. EVENTOS DE FORMULARIOS Y ACCIONES

// Evento Formulario Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const typedName = loginName.value.trim().toLowerCase();
    const typedPass = loginPassword.value.trim();

    // Buscar en nuestra base de datos local de usuarios
    const matchedUser = usersList.find(u => {
        const fullName = `${u.name} ${u.lastName}`.toLowerCase();
        return (fullName === typedName || u.name.toLowerCase() === typedName) && u.doc === typedPass;
    });

    if (matchedUser) {
        currentUser = matchedUser;
        localStorage.setItem('drill_current_user', JSON.stringify(currentUser));
        updateUIByRole();
        loginForm.reset();
        loginError.classList.add('hidden');
    } else {
        loginError.classList.remove('hidden');
    }
});

// Evento Guardar/Registrar Solicitud (Sistemas de Automatización)
requestForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!can('report')) { alert('Necesitás permisos de Cargador o superior para guardar cambios.'); return; }
    if (!selectedRigCardId) {
        alert("Por favor, selecciona un equipo de perforación de la izquierda.");
        return;
    }

    const rigId = selectedRigCardId;
    const rigIndex = rigsData.findIndex(r => r.id === rigId);
    if (rigIndex === -1) return;

    const clientName = rigsData[rigIndex].client;
    let anyChange = false;

    const rows = systemsConfigList.querySelectorAll('.system-config-row');

    rows.forEach(row => {
        const sys = row.querySelector('.sys-contract-check').getAttribute('data-system');
        const isContract = row.querySelector('.sys-contract-check').checked;
        const mailStatus = row.querySelector('.select-mail-status').value;

        let newModality = MODALITIES.INACTIVO;
        if (isContract) {
            newModality = MODALITIES.CONTRATO;
        } else if (mailStatus === 'SOLICITADO_MAIL') {
            newModality = MODALITIES.SOLICITADO_MAIL;
        }

        const oldModality = rigsData[rigIndex].systems[sys];

        // Registrar en el historial y base de datos si hubo cambios
        if (oldModality !== newModality) {
            rigsData[rigIndex].systems[sys] = newModality;
            anyChange = true;

            const newRequest = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                rig: rigId,
                client: clientName,
                system: sys,
                modality: newModality,
                date: new Date().toISOString()
            };
            requestsHistory.unshift(newRequest);
        }
    });

    if (anyChange) {
        localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
        localStorage.setItem('drill_requests_history', JSON.stringify(requestsHistory));
        
        // Refrescar interfaz
        renderRigsGrid();
        renderRequestsTable();
        calculateKPIs();
    }

    // Limpiar formulario y cambiar a pestaña de Solicitudes
    requestForm.reset();
    selectedRigCardId = null;
    updateAdminPanelState();
    document.querySelectorAll('.rig-card').forEach(c => c.classList.remove('active-card'));
    switchTab('tabRequests');
});

// Evento Crear Nuevo Usuario (Solo SUPER_ADMIN)
createUserForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!can('manage_users')) { alert('Solo el Super Administrador puede crear usuarios.'); return; }
    const newUName    = document.getElementById('uName').value.trim();
    const newULastName = document.getElementById('uLastName').value.trim();
    const newUDoc     = document.getElementById('uDoc').value.trim();
    const newURole    = (document.getElementById('uRole') ? document.getElementById('uRole').value : 'RESOLVER') || 'RESOLVER';
    if (!newUName || !newULastName || !newUDoc) { alert('Completá todos los campos.'); return; }
    if (newUDoc === SUPER_ADMIN_DOC) { alert('Ese DNI está reservado para el Super Admin principal.'); return; }
    if (usersList.some(u => u.doc === newUDoc)) { alert('Error: Ya existe un usuario con ese número de documento.'); return; }
    usersList.push({ name: newUName, lastName: newULastName, doc: newUDoc, role: newURole });
    localStorage.setItem('drill_users_list', JSON.stringify(usersList));
    renderUsersList();
    createUserForm.reset();
    alert(`Usuario ${newUName} ${newULastName} creado con rol: ${ROLE_LABELS[newURole] || newURole}.`);
});

// Eliminar Registro de Solicitud (Solo ADMIN+)
window.deleteRequest = function(reqId) {
    if (!can('delete')) return;
    if (!confirm("¿Está seguro de eliminar esta solicitud de la base de datos?")) return;

    // Buscar la solicitud para saber qué Rig y Sistema debemos resetear a INACTIVO
    const reqIndex = requestsHistory.findIndex(r => r.id === reqId);
    if (reqIndex !== -1) {
        const reqObj = requestsHistory[reqIndex];
        
        // Remover de la tabla de solicitudes
        requestsHistory.splice(reqIndex, 1);
        localStorage.setItem('drill_requests_history', JSON.stringify(requestsHistory));

        // Comprobar si hay alguna solicitud más reciente para ese mismo Rig + Sistema
        // Si no la hay, el Rig vuelve a estar INACTIVO en ese sistema
        const hasMoreRecent = requestsHistory.find(r => r.rig === reqObj.rig && r.system === reqObj.system);
        
        const rigIndex = rigsData.findIndex(r => r.id === reqObj.rig);
        if (rigIndex !== -1) {
            rigsData[rigIndex].systems[reqObj.system] = hasMoreRecent ? hasMoreRecent.modality : MODALITIES.INACTIVO;
            localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
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
    if (!confirm(`¿Eliminar a ${userToDelete.name} ${userToDelete.lastName} del sistema? Esta acción no puede deshacerse.`)) return;
    usersList = usersList.filter(u => u.doc !== docId);
    localStorage.setItem('drill_users_list', JSON.stringify(usersList));
    renderUsersList();
};

// 8. ASOCIACIÓN DE BOTONES SIMPLES Y EVENTOS GENERALES
logoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('drill_current_user');
    window.location.reload();
});

// Eventos de Pestañas
tabRequests.addEventListener('click', () => switchTab('tabRequests'));
tabUsers.addEventListener('click', () => switchTab('tabUsers'));
tabAdminActions.addEventListener('click', () => switchTab('tabAdminActions'));

// Eventos de Búsqueda y Filtros
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

// Botón para limpiar todo el historial acumulado
if (btnClearHistory) {
    btnClearHistory.addEventListener('click', function() {
        if (!currentUser) return;
        if (confirm("¿Está seguro de eliminar TODO el historial de solicitudes? Se vaciará el registro de cambios (el estado actual de los equipos no se perderá).")) {
            requestsHistory = [];
            localStorage.setItem('drill_requests_history', JSON.stringify(requestsHistory));
            renderRequestsTable();
            renderExcelHistory();
            calculateKPIs();
        }
    });
}

// Asociar eventos de clic de vinculación rápida a los botones de operadora
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
            // Ya está asignado a esa operadora
            return;
        }
        
        // Confirmar reasignación directa o liberación de contrato
        const confirmMsg = selectedClient === "" 
            ? `¿Confirmar dejar al Rig ${selectedRigCardId} Sin Contrato?` 
            : `¿Confirmar vinculación rápida del Rig ${selectedRigCardId} a ${selectedClient}?`;
            
        if (confirm(confirmMsg)) {
            rigsData[rigIndex].client = selectedClient;
            
            // Inyectar el registro de auditoría en el historial
            const clientChangeRequest = {
                id: Date.now().toString() + "client",
                rig: selectedRigCardId,
                client: selectedClient === "" ? "Sin Contrato" : selectedClient,
                system: "REASIGNACIÓN",
                modality: selectedClient === "" ? "Sin Contrato" : selectedClient,
                date: new Date().toISOString()
            };
            requestsHistory.unshift(clientChangeRequest);
            
            // Guardar base de datos
            localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
            localStorage.setItem('drill_requests_history', JSON.stringify(requestsHistory));
            
            // Refrescar vistas
            renderRigsGrid();
            renderRequestsTable();
            calculateKPIs();
            updateAdminPanelState();
            
            // Recargar formulario de sistemas para este rig (por si cambio de cliente afecta la cabecera)
            renderSystemsConfigForm(selectedRigCardId);
        }
    });
});

// ==============================================================
// 8.5 PLANILLA DE CARGA RÁPIDA TIPO EXCEL (V1.0.9)
// ==============================================================

// Estructura en memoria para conservar los datos temporales del Excel (5 filas)
let excelTempData = Array.from({ length: 5 }, () => ({
    rig: '',
    system: '',
    ourContact: '',
    sender: '',
    date: ''
}));

// Renderiza la planilla dinámica con exactamente 5 filas
function renderExcelSpreadsheet() {
    const tbody = document.getElementById('excelTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    for (let i = 0; i < 5; i++) {
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

        // Dropdown de Servicios (Sistemas de automatización)
        let systemOptions = '<option value="">-- Servicio --</option>';
        OFFICIAL_SYSTEMS.forEach(sys => {
            systemOptions += `<option value="${sys}" ${rowData.system === sys ? 'selected' : ''}>${sys}</option>`;
        });

        const isEditable = currentUser ? '' : 'disabled';

        tr.innerHTML = `
            <td class="excel-row-num">${i + 1}</td>
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
                <input type="text" class="excel-input excel-sender-input" data-row="${i}" placeholder="Remitente (Ej: correo@ypf.com)..." value="${rowData.sender || ''}" ${isEditable} oninput="window.updateExcelTempData(${i}, 'sender', this.value)">
            </td>
            <td>
                <input type="date" class="excel-input excel-date-input" data-row="${i}" value="${rowData.date || ''}" ${isEditable} onchange="window.updateExcelTempData(${i}, 'date', this.value)">
            </td>
            <td>
                <div class="excel-row-actions">
                    <button type="button" class="btn btn-success btn-excel-action" ${isEditable} onclick="window.processExcelRow(${i})">Procesar</button>
                    <button type="button" class="btn btn-operator btn-operator-none btn-excel-action" ${isEditable} style="border: 1px solid rgba(255, 68, 68, 0.4); text-shadow: none;" onclick="window.clearExcelRow(${i})">Limpiar</button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    }
}

// Renderiza las últimas 5 solicitudes procesadas de correo electrónico (modo lectura)
function renderExcelHistory() {
    const tbody = document.getElementById('excelHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Filtrar solicitudes del tipo SOLICITADO_MAIL
    const mailRequests = requestsHistory.filter(req => req.modality === MODALITIES.SOLICITADO_MAIL);

    // Tomar las 5 más recientes
    for (let i = 0; i < 5; i++) {
        const req = mailRequests[i];
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
                    <span class="system-status-dot-label status-SOLICITADO_MAIL" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; background: rgba(217, 70, 239, 0.08); border: 1px solid rgba(217, 70, 239, 0.15); color: #f472b6;">
                        <span class="dot" style="background-color: #d946ef;"></span> Procesado
                    </span>
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
            date: ''
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
    const sender = row.sender.trim();
    const dateVal = row.date;

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

    // Timezone safe-parsing
    let isoDate;
    if (dateVal) {
        isoDate = new Date(dateVal + "T12:00:00").toISOString();
    } else {
        const todayStr = new Date().toISOString().split('T')[0];
        isoDate = new Date(todayStr + "T12:00:00").toISOString();
    }

    const rigIndex = rigsData.findIndex(r => r.id === rigId);
    if (rigIndex === -1) return;

    const rigObj = rigsData[rigIndex];
    const clientName = rigObj.client || "Sin Contrato";

    // Actualizar base de datos
    rigObj.systems[system] = MODALITIES.SOLICITADO_MAIL;

    const newRequest = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        rig: rigId,
        client: clientName,
        system: system,
        modality: MODALITIES.SOLICITADO_MAIL,
        ourContact: ourContact,
        sender: sender,
        date: isoDate
    };

    requestsHistory.unshift(newRequest);

    // Guardar
    localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
    localStorage.setItem('drill_requests_history', JSON.stringify(requestsHistory));

    // Limpiar fila procesada
    window.clearExcelRow(rowIndex);

    // Refrescar vistas
    renderRigsGrid();
    renderRequestsTable();
    renderExcelHistory();
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

        for (let i = 0; i < 5; i++) {
            const row = excelTempData[i];
            const rigId = row.rig;
            const system = row.system;
            const ourContact = row.ourContact ? row.ourContact.trim() : '';
            const sender = row.sender.trim();
            const dateVal = row.date;

            // Fila completa si tiene Rig y Servicio seleccionados
            if (rigId && system) {
                if (!sender) {
                    alert(`Fila ${i + 1}: Falta ingresar el remitente.`);
                    return; // Detiene el procesamiento grupal para corregir el dato
                }

                let isoDate;
                if (dateVal) {
                    isoDate = new Date(dateVal + "T12:00:00").toISOString();
                } else {
                    const todayStr = new Date().toISOString().split('T')[0];
                    isoDate = new Date(todayStr + "T12:00:00").toISOString();
                }

                const rigIndex = rigsData.findIndex(r => r.id === rigId);
                if (rigIndex !== -1) {
                    const rigObj = rigsData[rigIndex];
                    const clientName = rigObj.client || "Sin Contrato";

                    rigObj.systems[system] = MODALITIES.SOLICITADO_MAIL;

                    const newRequest = {
                        id: (Date.now() + i).toString() + Math.random().toString(36).substr(2, 5),
                        rig: rigId,
                        client: clientName,
                        system: system,
                        modality: MODALITIES.SOLICITADO_MAIL,
                        ourContact: ourContact,
                        sender: sender,
                        date: isoDate
                    };

                    requestsHistory.unshift(newRequest);
                    window.clearExcelRow(i);
                    processedCount++;
                    anyChange = true;
                }
            }
        }

        if (anyChange) {
            localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
            localStorage.setItem('drill_requests_history', JSON.stringify(requestsHistory));

            renderRigsGrid();
            renderRequestsTable();
            renderExcelHistory();
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
        if (confirm("¿Confirmar limpieza completa de las 5 filas de la planilla? Se perderá lo que no haya sido procesado.")) {
            for (let i = 0; i < 5; i++) {
                window.clearExcelRow(i);
            }
        }
    });
}

// ==============================================================
// 8.8 LÓGICA DE NEGOCIO Y CONTROLADOR DE RIGLINE (CASOS TÉCNICOS)
// ==============================================================

// Alternar Pestaña Global (Automatización / RigLine / Versiones)
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

// Rellenar dinámicamente los pozos en los filtros y formulario de RigLine
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

// Renderizar la lista de casos RigLine según estado y filtros
function renderRigLineCases() {
    if (!rlCasesGrid) return;
    
    rlCasesGrid.innerHTML = '';
    
    const query = rlSearchInput ? rlSearchInput.value.toLowerCase().trim() : '';
    const priorityVal = rlFilterPriority ? rlFilterPriority.value : '';
    const rigVal = rlFilterRig ? rlFilterRig.value : '';
    const statusVal = rlFilterStatus ? rlFilterStatus.value : 'PENDIENTE';
    
    // Filtrar casos según estado y filtros
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
        
        // Estilo según prioridad para el borde neon sutil
        let priorityClass = 'low-priority';
        let badgeClass = 'low';
        if (c.priority === 'Alta') {
            priorityClass = 'high-priority';
            badgeClass = 'high';
        } else if (c.priority === 'Media') {
            priorityClass = 'medium-priority';
            badgeClass = 'medium';
        }
        
        // Aplicar clase resolved-case si está resuelto
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
        
        // Visibilidad y control de acción de cierre según permisos (Editor)
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
            resolvedBadge = `<span class="case-priority-badge resolved">✅ Resuelto</span>`;
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
                    <span class="case-reporter">Reportó: <strong style="color: var(--text-primary);">${c.reporter}</strong></span>
                    ${c.resolver ? `<span class="case-reporter">Resolvió: <strong style="color: var(--text-primary);">${c.resolver}</strong></span>` : ''}
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

// Calcular métricas de RigLine y refrescar en pantalla
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
    
    // 4. Equipo (Rig) más afectado por fallas técnicas pendientes
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
    
    // 5. Badge contador naranja de la pestaña global RigLine
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
        
        const caseId = rlCaseIdInput.value.trim();
        const rigId = rlRigSelect.value;
        const system = rlSystemSelect.value;
        const priority = rlPrioritySelect.value;
        const reporterName = rlReporterName.value.trim();
        const description = rlDescription.value.trim();
        
        if (!caseId || !rigId || !system || !priority || !reporterName || !description) {
            alert("Por favor, complete todos los campos obligatorios.");
            return;
        }
        
        // Validar que el identificador ingresado sea único
        const caseExists = riglineCases.some(c => c.id.toLowerCase() === caseId.toLowerCase());
        if (caseExists) {
            alert(`Error: Ya existe un caso registrado bajo el número "${caseId}". Por favor, introduce un identificador único.`);
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
            date: new Date().toISOString()
        };
        
        riglineCases.unshift(newCase);
        localStorage.setItem('drill_rigline_cases', JSON.stringify(riglineCases));
        
        // Resetear el formulario
        rlReportForm.reset();
        
        // Refrescar vistas y métricas de RigLine y del Centro de Control
        renderRigLineCases();
        calculateRigLineKPIs();
        renderRigsGrid();
        calculateKPIs();
        renderRigLineHistory();
        
        alert(`Caso creado con éxito bajo el registro ${caseId}. Se dará seguimiento inmediato.`);
    });
}


// Resolver y cerrar un caso (Exclusivo de Editores autorizados)
window.closeRigLineCase = function(caseId) {
    if (!can('resolve')) {
        alert("Acceso denegado. Necesitás permisos de Operador o superior para cerrar casos.");
        return;
    }
    
    if (!confirm(`¿Confirmar marcado de resolución para el caso ${caseId}? Se archivará del panel activo.`)) {
        return;
    }
    
    const caseIndex = riglineCases.findIndex(c => c.id === caseId);
    if (caseIndex !== -1) {
        // Encontrar tarjeta para animación de salida sutil
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
            
            localStorage.setItem('drill_rigline_cases', JSON.stringify(riglineCases));
            
            // Refrescar vistas
            renderRigLineCases();
            calculateRigLineKPIs();
            renderRigsGrid();
            calculateKPIs();
            renderRigLineHistory();
        }, 350); // Sincronizado con la duración de la animación
    }
};

// Eliminar permanentemente un caso (Exclusivo de Editores autorizados con contraseña)
window.deleteRigLineCase = function(caseId) {
    if (!can('delete')) {
        alert("Acceso denegado. Necesitás permisos de Administrador o superior para eliminar casos permanentemente.");
        return;
    }
    
    // Solicitar contraseña de confirmación
    const typedPassword = prompt(`ADVERTENCIA: ¿Confirmar la eliminación permanente del caso ${caseId}?\n\nEsta acción no se puede deshacer. Ingrese su contraseña de Editor (Número de documento) para confirmar:`);
    
    if (typedPassword === null) {
        // El usuario canceló el prompt
        return;
    }
    
    if (typedPassword.trim() !== currentUser.doc) {
        alert("Contraseña incorrecta. La eliminación del caso ha sido cancelada.");
        return;
    }
    
    const caseIndex = riglineCases.findIndex(c => c.id === caseId);
    if (caseIndex !== -1) {
        // Encontrar tarjeta para animación de salida sutil de rotación y escala
        const card = document.querySelector(`[data-case-id="${caseId}"]`);
        if (card) {
            card.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
            card.style.transform = 'scale(0.8) rotate(-3deg)';
            card.style.opacity = '0';
        }
        
        setTimeout(() => {
            riglineCases.splice(caseIndex, 1);
            localStorage.setItem('drill_rigline_cases', JSON.stringify(riglineCases));
            
            // Refrescar vistas
            renderRigLineCases();
            calculateRigLineKPIs();
            renderRigsGrid();
            calculateKPIs();
            renderRigLineHistory();
        }, 350); // Sincronizado con la duración de la animación
    }
};

// ==============================================================
// 8.9 EXPORTACIÓN DE CASOS RIGLINE A TXT
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
            if (!iso) return '—';
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
            txtContent += `Nº CASO   : ${c.id}\r\n`;
            txtContent += `EQUIPO    : ${c.rig}\r\n`;
            txtContent += `SISTEMA   : ${c.system}\r\n`;
            txtContent += `PRIORIDAD : ${c.priority}\r\n`;
            txtContent += `FECHA     : ${fmtDate(c.date)}\r\n`;
            txtContent += `REPORTANTE: ${c.reporter}\r\n`;
            txtContent += `DESCRIPCIÓN:\r\n${c.description}\r\n`;
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

// ─────────────────────────────────────────────────────────────────────────────
// HISTORIAL COMPLETO DE CASOS RIGLINE — Planilla al pie de página
// ─────────────────────────────────────────────────────────────────────────────
function renderRigLineHistory() {
    const tbody = document.getElementById('rlHistoryTableBody');
    const countEl = document.getElementById('rlHistoryTotalCount');
    const searchEl = document.getElementById('rlHistorySearch');
    if (!tbody) return;

    const query = searchEl ? searchEl.value.toLowerCase().trim() : '';

    // Ordenar todos los casos de más reciente a más antiguo (por fecha de apertura)
    const sorted = [...riglineCases].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Aplicar búsqueda rápida sobre todos los campos visibles
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
                    ${query ? 'No se encontraron casos para "' + query + '".' : 'No hay casos registrados aún.'}
                </td>
            </tr>`;
        return;
    }

    // Helper de formato de fecha compacta
    function fmtDate(iso) {
        if (!iso) return '—';
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
            ? `<span class="rl-status-badge resuelto">✓ Resuelto</span>`
            : `<span class="rl-status-badge pendiente">● Pendiente</span>`;
        const closedDateHtml = c.closedDate
            ? `<span class="rl-history-date closed">${fmtDate(c.closedDate)}</span>`
            : `<span style="color: var(--color-inactive); font-size: 0.7rem;">—</span>`;

        return `
            <tr class="${rowClass}">
                <td class="rl-history-case-id">${c.id}</td>
                <td class="rl-history-rig">${c.rig}</td>
                <td style="color: var(--text-primary); max-width: 140px; overflow: hidden; text-overflow: ellipsis;">${c.system}</td>
                <td><span class="rl-priority-dot ${prioClass}">${c.priority}</span></td>
                <td style="color: var(--text-muted);">${c.reporter}</td>
                <td style="color: var(--text-muted);">${c.resolver || '<span style="opacity:0.4;">—</span>'}</td>
                <td class="rl-history-date">${fmtDate(c.date)}</td>
                <td>${closedDateHtml}</td>
                <td>${statusBadge}</td>
            </tr>`;
    }).join('');
}

// Conectar la búsqueda del historial en tiempo real
const rlHistorySearch = document.getElementById('rlHistorySearch');
if (rlHistorySearch) rlHistorySearch.addEventListener('input', renderRigLineHistory);


// 9. INICIALIZACIÓN COMPLETA AL CARGAR LA APP
window.addEventListener('DOMContentLoaded', () => {
    populateRigLineDropdowns(); // Rellenar selects e filtros de RigLine
    renderRigsGrid();
    renderRequestsTable();
    calculateKPIs();
    
    // Inicializar RigLine
    renderRigLineCases();
    calculateRigLineKPIs();
    renderRigLineHistory();
    
    checkSession();
});

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
        OFFICIAL_SYSTEMS.forEach(sys => {
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
            localStorage.setItem('drill_rigs_data', JSON.stringify(rigsData));
            showVersionToast(`Rig ${rigId} - ${systemName} actualizado`);
        }
    }
};

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
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Registro de Service Worker para PWA (Instalación fácil en celulares)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado correctamente', reg))
            .catch(err => console.warn('Error al registrar Service Worker', err));
    });
}
