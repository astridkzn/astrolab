/* ─── Admin nav ──────────────────────────────────────────────────────────────── */
const ADMIN_NAV = [
    { view: 'montage',    label: 'Montage',    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>` },
    { view: 'inventaire', label: 'Inventaire', icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>` },
    { view: 'prog',       label: 'Prog',       icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>` },
    { view: 'equipes',    label: 'Équipes',    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
    { view: 'covoit',     label: 'Covoit',     icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="9" width="22" height="9" rx="2"/><path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>` },
    { view: 'todo',       label: 'Todo',       icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
];

const TODO_CATEGORIES = ['Montage', 'Démontage', 'Cuisine', 'Bar', 'DJ', 'Matériel', 'Comm'];


/* ─── Admin templates ────────────────────────────────────────────────────────── */
const AdminTpl = {

    // ── Montage ───────────────────────────────────────────────────────────────

    montage(tasks, inventaire = []) {
        const TEAMS = ['Hangar', 'Préau', 'Gîte-Stockage-Courses'];
        const byTeam = {};
        TEAMS.forEach(t => byTeam[t] = []);
        tasks.forEach(t => {
            if (byTeam[t.team] !== undefined) byTeam[t.team].push(t);
        });

        return `
            <div class="day-tabs">
                ${TEAMS.map((t, i) => `
                    <button class="day-tab ${i === 0 ? 'active' : ''}" data-panel="${t}">${t}</button>
                `).join('')}
            </div>
            ${TEAMS.map((t, i) => {
                const teamTasks = byTeam[t];
                const byCategorie = {};
                [...teamTasks]
                    .sort((a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0))
                    .forEach(task => {
                        (byCategorie[task.categorie] = byCategorie[task.categorie] || []).push(task);
                    });

                const keywords = t.split('-').map(s => s.trim().toLowerCase());
                const teamInv  = inventaire.filter(item => {
                    const util = (item.utilisation || '').toString().toLowerCase();
                    return keywords.some(kw => kw.length > 1 && util.includes(kw));
                });

                const invHtml = teamInv.length ? `
                    <div class="admin-section">
                        <div class="admin-section-title">Inventaire</div>
                        <div class="montage-inv-list">
                            ${teamInv.map(item => `
                                <div class="montage-inv-row">
                                    <div>
                                        <div class="montage-inv-name">
                                            ${item.nom}${Number(item.quantite) > 1 ? ` × ${item.quantite}` : ''}
                                        </div>
                                        ${item.lieu ? `<div class="montage-inv-loc">${item.lieu}</div>` : ''}
                                    </div>
                                    ${item.recupere ? `<span class="montage-inv-done">✓</span>` : ''}
                                </div>`).join('')}
                        </div>
                    </div>` : '';

                return `
                    <div class="day-panel ${i > 0 ? 'hidden' : ''}" data-panel="${t}">
                        ${Object.entries(byCategorie).map(([cat, catTasks]) => `
                            <div class="admin-section">
                                <div class="admin-section-title">${cat}</div>
                                ${catTasks.map(task => {
                                    const hasDetail = !!(task.description || task.schema_url);
                                    return `
                                    <div class="montage-task${hasDetail ? ' has-detail' : ''}">
                                        <div class="montage-task-header">
                                            <span class="task-name">${task.tache}</span>
                                            <div class="montage-task-right">
                                                ${task.duree_estimee
                                                    ? `<span class="task-dur">${task.duree_estimee}</span>`
                                                    : ''}
                                                ${hasDetail
                                                    ? `<span class="task-chevron">${icons.chevronDown}</span>`
                                                    : ''}
                                            </div>
                                        </div>
                                        ${hasDetail ? `
                                            <div class="montage-task-body hidden">
                                                ${task.description
                                                    ? `<div class="montage-task-desc">${fmt(task.description)}</div>`
                                                    : ''}
                                                ${task.schema_url
                                                    ? `<img src="${task.schema_url}" class="montage-task-schema" alt="">`
                                                    : ''}
                                            </div>` : ''}
                                    </div>`;
                                }).join('')}
                            </div>`).join('')}
                        ${!Object.keys(byCategorie).length
                            ? '<div class="empty-state">Pas de tâches pour cette team</div>'
                            : ''}
                        ${invHtml}
                    </div>`;
            }).join('')}`;
    },


    // ── Inventaire ────────────────────────────────────────────────────────────

    inventaire(items) {
        return `
            <div class="inv-search-wrap">
                <input type="text" id="inv-search" class="inv-search" placeholder="Rechercher…">
            </div>
            <div id="inv-list" class="inv-grid">
                ${items.map(item => `
                    <div class="inv-card ${item.recupere === true ? 'checked' : ''}" data-checkrow
                         data-search="${(item.nom + ' ' + (item.categorie || '') + ' ' + (item.lieu || '')).toLowerCase()}">
                        <div class="inv-card-img ${item.image_url ? '' : 'no-img'}">
                            ${item.image_url
                                ? `<img src="${item.image_url}" alt="${item.nom}"
                                        onerror="this.parentElement.classList.add('no-img');this.remove()">`
                                : `<span class="inv-card-placeholder">${(item.nom || '?')[0].toUpperCase()}</span>`
                            }
                        </div>
                        <div class="inv-card-body">
                            <div class="inv-name">
                                ${item.nom}${Number(item.quantite) > 1 ? ` <span class="inv-qty">× ${item.quantite}</span>` : ''}
                            </div>
                            <div class="inv-meta">${[item.lieu, item.utilisation].filter(Boolean).join(' · ')}</div>
                            <div class="inv-card-footer">
                                <span class="owner-badge owner-${(item.proprietaire || '').toLowerCase().replace(/\s+/g, '-')}">
                                    ${item.proprietaire || '—'}
                                </span>
                                <label class="inv-check-wrap">
                                    <input type="checkbox" class="admin-check"
                                        data-tab="inventaire" data-row="${item._row}" data-col="recupere"
                                        ${item.recupere === true ? 'checked' : ''}>
                                    <span class="check-label">Récupéré</span>
                                </label>
                            </div>
                        </div>
                    </div>`).join('')}
            </div>`;
    },


    // ── Équipes ───────────────────────────────────────────────────────────────

    equipes(cuisine, bar, dodo) {
        const cuisineBySlot = {};
        cuisine.forEach(r => (cuisineBySlot[r.slot] = cuisineBySlot[r.slot] || []).push(r));

        const barByNight = {};
        bar.forEach(r => {
            if (!barByNight[r.nuit]) barByNight[r.nuit] = {};
            (barByNight[r.nuit][r.tranche] = barByNight[r.nuit][r.tranche] || []).push(r);
        });

        const dodoByGite = {};
        dodo.forEach(r => (dodoByGite[r.gite] = dodoByGite[r.gite] || []).push(r));

        const cuisineHtml = Object.keys(cuisineBySlot).length ? `
            <p class="section-label">Cuisine</p>
            <div class="equipes-block">
                ${Object.entries(cuisineBySlot).map(([slot, people]) => `
                    <div class="equipes-slot">
                        <div class="slot-label">${slot}</div>
                        <div class="slot-people">
                            ${people.map(p => `
                                <span class="editable-name"
                                      data-tab="shifts_cuisine" data-row="${p._row}" data-col="nom">
                                    ${p.nom || '—'}
                                </span>`).join('')}
                        </div>
                    </div>`).join('')}
            </div>` : '';

        const barHtml = Object.entries(barByNight).map(([nuit, tranches]) => `
            <p class="section-label">Bar — ${nuit}</p>
            <div class="equipes-block">
                ${Object.entries(tranches).map(([tranche, people]) => `
                    <div class="equipes-slot">
                        <div class="slot-label">${tranche}</div>
                        <div class="slot-people">
                            ${people.map(p => `
                                <span class="editable-name"
                                      data-tab="shifts_bar" data-row="${p._row}" data-col="nom">
                                    ${p.nom || '—'}
                                </span>`).join('')}
                        </div>
                    </div>`).join('')}
            </div>`).join('');

        const dodoHtml = Object.keys(dodoByGite).length ? `
            <p class="section-label">Plan dodo</p>
            ${Object.entries(dodoByGite).map(([gite, rooms]) => `
                <div class="equipes-block">
                    <div class="equipes-gite-title">${gite}</div>
                    ${rooms.map(r => `
                        <div class="dodo-edit-row">
                            <div class="dodo-edit-info">
                                <div class="dodo-edit-chambre">${r.chambre}</div>
                                <div class="dodo-edit-meta">
                                    ${[r.etage, r.config_lit].filter(Boolean).join(' · ')}
                                </div>
                            </div>
                            <span class="editable-name"
                                  data-tab="plan_dodo" data-row="${r._row}" data-col="occupant">
                                ${r.occupant || '—'}
                            </span>
                        </div>`).join('')}
                </div>`).join('')}` : '';

        return (cuisineHtml + barHtml + dodoHtml)
            || '<div class="empty-state">Pas encore de données</div>';
    },


    // ── Prog admin (repas détaillé) ────────────────────────────────────────────

    repasTable(repas) {
        if (!repas.length) return '';

        const byDay = {};
        repas.forEach(r => (byDay[r.jour] = byDay[r.jour] || []).push(r));

        return `
            <p class="section-label">Récap repas</p>
            ${Object.entries(byDay).map(([jour, plats]) => `
                <div class="admin-section">
                    <div class="admin-section-title">${jour}</div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Moment</th><th>Plat</th>
                                <th>Allergènes</th><th>Quand préparer</th><th>Shift</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${plats.map(p => `
                                <tr>
                                    <td class="cell-muted">${p.moment}</td>
                                    <td><strong>${p.plat}</strong></td>
                                    <td class="cell-muted">${p.allergenes || '—'}</td>
                                    <td class="cell-muted">${p.prepare_quand || '—'}</td>
                                    <td class="cell-muted">${p.shift_responsable || '—'}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`).join('')}`;
    },


    // ── Covoit admin (avec téléphones) ─────────────────────────────────────────

    covoit(voitures, passagers, train) {
        const paxByDriver = {};
        passagers.forEach(p => (paxByDriver[p.conducteur] = paxByDriver[p.conducteur] || []).push(p));

        const voituresHtml = voitures.length ? `
            <p class="section-label">Voitures</p>
            <div class="covoit-block">
                ${voitures.map(v => `
                    <div class="car-card">
                        <div class="car-conductor">${v.conducteur}</div>
                        ${v.telephone
                            ? `<a class="car-phone" href="tel:${v.telephone}">${icons.phone} ${v.telephone}</a>`
                            : ''}
                        <div class="car-meta">
                            ${[v.lieu_depart, v.heure_depart].filter(Boolean).join(' · ')}
                            ${v.heure_arrivee_festival ? ` → arrivée ${v.heure_arrivee_festival}` : ''}
                        </div>
                        <span class="car-badge">
                            ${v.nb_places} place${v.nb_places > 1 ? 's' : ''}
                        </span>
                        ${paxByDriver[v.conducteur]?.length ? `
                            <div class="car-passengers">
                                <div class="car-passengers-label">Passagers</div>
                                ${paxByDriver[v.conducteur].map(p => `
                                    <div class="passenger-row">
                                        ${p.nom_passager}
                                        <span style="color:var(--text-3)">(${p.trajet})</span>
                                    </div>`).join('')}
                            </div>` : ''}
                    </div>`).join('')}
            </div>` : '';

        const trainHtml = train.length ? `
            <p class="section-label">Train</p>
            <div class="covoit-block">
                ${train.map(t => `
                    <div class="car-card">
                        <div class="car-conductor">${t.nom}</div>
                        <div class="car-meta">
                            ${t.heure_depart_train ? `Départ ${t.jour_aller} ${t.heure_depart_train}` : ''}
                            ${t.heure_retour_train ? ` · Retour ${t.jour_retour} ${t.heure_retour_train}` : ''}
                        </div>
                        ${t.conducteur_pickup
                            ? `<div class="car-meta">Pickup : ${t.conducteur_pickup}</div>`
                            : ''}
                    </div>`).join('')}
            </div>` : '';

        return voituresHtml + trainHtml
            || '<div class="empty-state">Pas encore de covoiturage défini</div>';
    },


    // ── Todo ──────────────────────────────────────────────────────────────────

    todo(items) {
        const validItems = items.filter(item => (item.tache || '').toString().trim());
        const byCategorie = {};
        validItems.forEach(item => (byCategorie[item.categorie] = byCategorie[item.categorie] || []).push(item));

        return `
            <div class="todo-topbar">
                <button id="todo-add-btn" class="btn-add-todo">+ Ajouter</button>
            </div>
            <div id="todo-add-form" class="todo-add-form hidden">
                <input type="text" id="todo-new-task" class="todo-input" placeholder="Nouvelle tâche…">
                <select id="todo-new-cat" class="todo-select">
                    ${TODO_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
                <div class="todo-form-btns">
                    <button id="todo-confirm-btn" class="btn-confirm">Ajouter</button>
                    <button id="todo-cancel-btn" class="btn-ghost">Annuler</button>
                </div>
            </div>

            ${Object.keys(byCategorie).length
                ? Object.entries(byCategorie).map(([cat, catItems]) => `
                    <p class="section-label">${cat}</p>
                    <div class="todo-list">
                        ${catItems.map(item => `
                            <div class="todo-item ${item.fait === true ? 'checked' : ''}" data-checkrow>
                                <label class="todo-check-wrap">
                                    <input type="checkbox" class="admin-check"
                                        data-tab="todo" data-row="${item._row}" data-col="fait"
                                        ${item.fait === true ? 'checked' : ''}>
                                </label>
                                <span class="todo-task">${item.tache}</span>
                            </div>`).join('')}
                    </div>`).join('')
                : '<div class="empty-state" style="margin-top:24px">Aucune tâche pour l\'instant</div>'
            }`;
    },
};
