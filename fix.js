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
                finBtnHtml = `<button class="btn-fin-service" onclick="event.stopPropagation(); window.finalizeService('${rig.id}', '${sys}')" title="Finalizar Servicio" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; padding: 2px 6px; font-size: 0.65rem; cursor: pointer; margin-right: 6px;">Fin</button>`;
            }

            systemsHtml += `
                <div class="rig-system-item" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div style="display: flex; align-items: center;">
                        ${finBtnHtml}
                        <span class="system-name">${label}</span>
                    </div>
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
