/* ─── App ────────────────────────────────────────────────────────────────────── */
const App = {
    role:    null,
    _lineup: [],
    _textes: {},

    init() {
        document.getElementById('login-form').addEventListener('submit', e => {
            e.preventDefault();
            const pwd = document.getElementById('login-input').value.trim();
            if (pwd === CONFIG.PASSWORDS.admin) {
                this._enter('admin');
            } else if (pwd === CONFIG.PASSWORDS.festivalier) {
                this._enter('festivalier');
            } else {
                document.getElementById('login-error').textContent = 'Mot de passe incorrect';
                document.getElementById('login-input').select();
            }
        });

        document.getElementById('modal-close').addEventListener('click', () => this._closeModal());
        document.getElementById('modal-bg').addEventListener('click', () => this._closeModal());

        document.getElementById('app-main').addEventListener('click', e => {
            const link = e.target.closest('[data-nav]');
            if (link) this.go(link.dataset.nav);
        });

        this._loadTextes();
    },

    async _loadTextes() {
        try {
            const rows = await Api.get('textes');
            rows.forEach(r => { if (r.cle) this._textes[r.cle] = r.valeur ?? ''; });
        } catch (_) {}
    },

    t(key, fallback = '') {
        return this._textes[key] !== undefined ? this._textes[key] : fallback;
    },

    _enter(role) {
        this.role = role;
        this._populateNav();
        document.getElementById('screen-login').classList.add('hidden');
        document.getElementById('screen-app').classList.remove('hidden');
        this.go(role === 'admin' ? 'montage' : 'home');
    },


    // ── Navigation ────────────────────────────────────────────────────────────

    _populateNav() {
        const nav = document.getElementById('bottom-nav');

        if (this.role === 'admin') {
            nav.innerHTML = ADMIN_NAV.map(item => `
                <button class="nav-btn" data-view="${item.view}">
                    ${item.icon}
                    <span>${item.label}</span>
                </button>`).join('');
        }

        nav.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.go(btn.dataset.view));
        });
    },

    go(view) {
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.view === view);
        });

        const labels = {
            home: 'Astrolab', programme: 'Programme', shifts: 'Shifts',
            covoit: 'Covoiturage', infos: 'Infos', plandodo: 'Plan dodo',
            deguisements: 'Déguisements',
            montage: 'Montage', inventaire: 'Inventaire', prog: 'Programme',
            equipes: 'Équipes', todo: 'Todo',
        };
        document.getElementById('header-title').textContent = labels[view] ?? view;
        this._render(view);
    },


    // ── Render ────────────────────────────────────────────────────────────────

    async _render(view) {
        const main = document.getElementById('app-main');
        main.innerHTML = Tpl.loading();

        try {
            if (this.role === 'admin') {
                await this._renderAdmin(view, main);
            } else {
                await this._renderFestivalier(view, main);
            }
        } catch (err) {
            main.innerHTML = '<div class="empty-state">Erreur de chargement</div>';
            console.error(err);
        }
    },

    async _renderFestivalier(view, main) {
        switch (view) {
            case 'home':         main.innerHTML = Tpl.home();         break;
            case 'programme':    await this._renderProgramme(main);   break;
            case 'shifts':       await this._renderShifts(main);      break;
            case 'covoit':       await this._renderCovoit(main);      break;
            case 'plandodo':     await this._renderDodo(main);        break;
            case 'infos':        await this._renderInfos(main);       break;
            case 'deguisements': main.innerHTML = Tpl.deguisements(); break;
            default:             main.innerHTML = '<div class="empty-state">À venir</div>';
        }
    },

    async _renderAdmin(view, main) {
        switch (view) {
            case 'montage':    await this._renderAdminMontage(main);    break;
            case 'inventaire': await this._renderAdminInventaire(main); break;
            case 'prog':       await this._renderAdminProg(main);       break;
            case 'equipes':    await this._renderAdminEquipes(main);    break;
            case 'covoit':     await this._renderAdminCovoit(main);     break;
            case 'todo':       await this._renderAdminTodo(main);       break;
            default:           main.innerHTML = '<div class="empty-state">À venir</div>';
        }
    },


    // ── Festivalier views ─────────────────────────────────────────────────────

    async _renderProgramme(main) {
        const lineup = await Api.get('lineup');
        this._lineup = lineup;

        const days  = ['Vendredi', 'Samedi', 'Dimanche'];
        const byDay = { Vendredi: [], Samedi: [], Dimanche: [] };
        lineup.forEach((set, idx) => {
            set._idx = idx;
            if (byDay[set.jour] !== undefined) byDay[set.jour].push(set);
        });

        main.innerHTML = Tpl.programme(days, byDay);
        this._bindTabs(main);
        main.querySelectorAll('.set-card.clickable').forEach(card => {
            card.addEventListener('click', () => {
                const set = this._lineup[parseInt(card.dataset.idx)];
                if (set) this._openModal(set);
            });
        });
    },

    async _renderInfos(main) {
        const repas = await Api.get('repas');
        main.innerHTML = Tpl.infos(repas);
        main.querySelectorAll('.accordion-header').forEach(h => {
            h.addEventListener('click', () => h.closest('.accordion').classList.toggle('open'));
        });
    },

    async _renderShifts(main) {
        const [cuisine, bar] = await Promise.all([Api.get('shifts_cuisine'), Api.get('shifts_bar')]);
        main.innerHTML = Tpl.shifts(cuisine, bar);
    },

    async _renderCovoit(main) {
        const [voitures, passagers, train] = await Promise.all([
            Api.get('covoit_voitures'), Api.get('covoit_passagers'), Api.get('covoit_train'),
        ]);
        main.innerHTML = Tpl.covoit(voitures, passagers, train);
    },

    async _renderDodo(main) {
        const rows = await Api.get('plan_dodo');
        main.innerHTML = Tpl.dodo(rows);
        this._bindTabs(main);
    },


    // ── Admin views ───────────────────────────────────────────────────────────

    async _renderAdminMontage(main) {
        const tasks = await Api.get('montage_tasks');
        main.innerHTML = AdminTpl.montage(tasks);
        this._bindTabs(main);
    },

    async _renderAdminInventaire(main) {
        const items = await Api.get('inventaire');
        main.innerHTML = AdminTpl.inventaire(items);
        this._bindAdminChecks(main);

        const search = main.querySelector('#inv-search');
        const list   = main.querySelector('#inv-list');
        search.addEventListener('input', () => {
            const q = search.value.toLowerCase().trim();
            list.querySelectorAll('.inv-card').forEach(item => {
                item.style.display = (!q || item.dataset.search.includes(q)) ? '' : 'none';
            });
        });
    },

    async _renderAdminProg(main) {
        const [lineup, repas] = await Promise.all([Api.get('lineup'), Api.get('repas')]);
        this._lineup = lineup;

        const days  = ['Vendredi', 'Samedi', 'Dimanche'];
        const byDay = { Vendredi: [], Samedi: [], Dimanche: [] };
        lineup.forEach((set, idx) => {
            set._idx = idx;
            if (byDay[set.jour] !== undefined) byDay[set.jour].push(set);
        });

        main.innerHTML = Tpl.programme(days, byDay) + AdminTpl.repasTable(repas);
        this._bindTabs(main);
        main.querySelectorAll('.set-card.clickable').forEach(card => {
            card.addEventListener('click', () => {
                const set = this._lineup[parseInt(card.dataset.idx)];
                if (set) this._openModal(set);
            });
        });
    },

    async _renderAdminEquipes(main) {
        const [cuisine, bar, dodo] = await Promise.all([
            Api.get('shifts_cuisine'), Api.get('shifts_bar'), Api.get('plan_dodo'),
        ]);
        main.innerHTML = AdminTpl.equipes(cuisine, bar, dodo);
        this._bindEditableFields(main);
    },

    async _renderAdminCovoit(main) {
        const [voitures, passagers, train] = await Promise.all([
            Api.get('covoit_voitures'), Api.get('covoit_passagers'), Api.get('covoit_train'),
        ]);
        main.innerHTML = AdminTpl.covoit(voitures, passagers, train);
    },

    async _renderAdminTodo(main) {
        const items = await Api.get('todo');
        main.innerHTML = AdminTpl.todo(items);
        this._bindAdminChecks(main);
        this._bindTodoForm(main);
    },


    // ── Shared helpers ────────────────────────────────────────────────────────

    _bindTabs(container) {
        container.querySelectorAll('.day-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
                container.querySelectorAll('.day-panel').forEach(p => p.classList.add('hidden'));
                tab.classList.add('active');
                const panel = container.querySelector(`.day-panel[data-panel="${tab.dataset.panel}"]`);
                if (panel) panel.classList.remove('hidden');
            });
        });
    },

    _bindAdminChecks(container) {
        container.addEventListener('change', async e => {
            const cb = e.target.closest('.admin-check');
            if (!cb) return;

            cb.disabled = true;
            const val = cb.checked;
            const row = cb.closest('[data-checkrow]');
            if (row) row.classList.toggle('checked', val);

            await Api.write({
                action: 'update_cell',
                tab:    cb.dataset.tab,
                row:    cb.dataset.row,
                col:    cb.dataset.col,
                value:  val ? 'true' : 'false',
            });

            cb.disabled = false;
        });
    },

    _bindEditableFields(container) {
        container.addEventListener('click', e => {
            const span = e.target.closest('.editable-name');
            if (!span || span.querySelector('input')) return;

            const original = span.textContent.trim();
            const input    = document.createElement('input');
            input.className = 'editable-input';
            input.value     = original === '—' ? '' : original;
            span.textContent = '';
            span.appendChild(input);
            input.focus();
            input.select();

            const save = async () => {
                const newVal = input.value.trim();
                span.textContent = newVal || '—';
                if (newVal !== original && !(newVal === '' && original === '—')) {
                    await Api.write({
                        action: 'update_cell',
                        tab:    span.dataset.tab,
                        row:    span.dataset.row,
                        col:    span.dataset.col,
                        value:  newVal,
                    });
                }
            };

            input.addEventListener('blur', save);
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
                if (e.key === 'Escape') { span.textContent = original; }
            });
        });
    },

    _bindTodoForm(main) {
        const btn        = main.querySelector('#todo-add-btn');
        const form       = main.querySelector('#todo-add-form');
        const confirmBtn = main.querySelector('#todo-confirm-btn');
        const cancelBtn  = main.querySelector('#todo-cancel-btn');
        const input      = main.querySelector('#todo-new-task');
        const select     = main.querySelector('#todo-new-cat');

        btn.addEventListener('click', () => {
            form.classList.remove('hidden');
            input.focus();
        });

        cancelBtn.addEventListener('click', () => {
            form.classList.add('hidden');
            input.value = '';
        });

        confirmBtn.addEventListener('click', async () => {
            const tache     = input.value.trim();
            const categorie = select.value;
            console.log('[todo] submit', { tache, categorie });
            if (!tache) { input.focus(); return; }

            confirmBtn.disabled = true;
            const result = await Api.write({ action: 'append_todo', tache, categorie });
            console.log('[todo] write result', result);
            await this._renderAdminTodo(main);
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') confirmBtn.click();
        });
    },


    // ── Modal DJ ──────────────────────────────────────────────────────────────

    _openModal(set) {
        document.getElementById('modal-body').innerHTML = Tpl.djModal(set);
        document.getElementById('dj-modal').classList.remove('hidden');
    },

    _closeModal() {
        document.getElementById('dj-modal').classList.add('hidden');
    },
};


/* ─── Templates festivalier ──────────────────────────────────────────────────── */
const Tpl = {

    loading: () => `
        <div class="loading-state">
            <div class="spinner"></div>
            <span>Chargement…</span>
        </div>`,

    home: () => `
        <div class="home-grid">
            <div class="home-card wide" data-nav="programme">
                <div class="home-card-icon">${icons.music}</div>
                <div>
                    <div class="home-card-label">Programme</div>
                    <div class="home-card-sub">Lineup & horaires</div>
                </div>
            </div>
            <div class="home-card" data-nav="shifts">
                <div class="home-card-icon">${icons.clock}</div>
                <div class="home-card-label">Shifts</div>
                <div class="home-card-sub">Cuisine & bar</div>
            </div>
            <div class="home-card" data-nav="plandodo">
                <div class="home-card-icon">${icons.home_}</div>
                <div class="home-card-label">Plan dodo</div>
                <div class="home-card-sub">Chambres</div>
            </div>
            <div class="home-card" data-nav="covoit">
                <div class="home-card-icon">${icons.car}</div>
                <div class="home-card-label">Covoit</div>
                <div class="home-card-sub">Voitures & train</div>
            </div>
            <div class="home-card" data-nav="deguisements">
                <div class="home-card-icon">${icons.star}</div>
                <div class="home-card-label">Déguisements</div>
                <div class="home-card-sub">Inspiration</div>
            </div>
            <div class="home-card" data-nav="infos">
                <div class="home-card-icon">${icons.info}</div>
                <div class="home-card-label">Infos</div>
                <div class="home-card-sub">Pratique</div>
            </div>
        </div>`,

    programme: (days, byDay) => `
        <div class="day-tabs">
            ${days.map((d, i) => `
                <button class="day-tab ${i === 0 ? 'active' : ''}" data-panel="${d}">${d}</button>
            `).join('')}
        </div>
        ${days.map((d, i) => `
            <div class="day-panel ${i !== 0 ? 'hidden' : ''}" data-panel="${d}">
                <div class="timeline">
                    ${byDay[d].length
                        ? byDay[d].map(set => Tpl.setCard(set)).join('')
                        : '<div class="empty-state">Pas encore de programme pour ce jour</div>'
                    }
                </div>
            </div>
        `).join('')}`,

    setCard: (set) => {
        const type      = (set.type || 'info').toLowerCase();
        const clickable = set.type === 'DJ';
        const scene     = [set.scene, !clickable ? set.type : ''].filter(Boolean).join(' · ');
        return `
            <div class="set-card type-${type} ${clickable ? 'clickable' : ''}"
                 ${clickable ? `data-idx="${set._idx}"` : ''}>
                <div class="set-time">${set.heure_debut}</div>
                <div class="set-info">
                    <div class="set-name">${set.nom}</div>
                    ${scene ? `<div class="set-detail">${scene}</div>` : ''}
                    ${set.style ? `<div class="set-style">${set.style}</div>` : ''}
                </div>
                ${clickable ? `<div class="set-arrow">${icons.chevron}</div>` : ''}
            </div>`;
    },

    djModal: (set) => `
        ${set.image_url
            ? `<img src="${set.image_url}" alt="${set.nom}" class="dj-portrait" onerror="this.style.display='none'">`
            : ''
        }
        <div class="dj-name">${set.nom}</div>
        ${set.style ? `<div class="dj-style">${set.style}</div>` : ''}
        <div class="dj-tags">
            ${set.heure_debut && set.heure_fin
                ? `<span class="dj-tag">${set.heure_debut} → ${set.heure_fin}</span>`
                : ''}
            ${set.scene    ? `<span class="dj-tag">${set.scene}</span>`    : ''}
            ${set.materiel ? `<span class="dj-tag">${set.materiel}</span>` : ''}
        </div>`,

    infos: (repas) => {
        const byDay = {};
        repas.forEach(r => (byDay[r.jour] = byDay[r.jour] || []).push(r));

        const repasHtml = Object.keys(byDay).length ? `
            <p class="section-label">Menu</p>
            <div class="accordion-list">
                ${Object.entries(byDay).map(([jour, plats]) => `
                    <div class="accordion">
                        <div class="accordion-header">
                            ${jour} ${icons.chevronDown}
                        </div>
                        <div class="accordion-body">
                            ${plats.map(p => `
                                <div class="repas-row">
                                    <span class="repas-moment">${p.moment}</span>
                                    <span class="repas-plat">${p.plat}</span>
                                    ${p.allergenes ? `<span class="repas-allergenes">${p.allergenes}</span>` : ''}
                                </div>`).join('')}
                        </div>
                    </div>`).join('')}
            </div>` : '';

        return `
            <p class="section-label">Pratique</p>
            <div class="accordion-list">
                <div class="accordion">
                    <div class="accordion-header">Comment venir ${icons.chevronDown}</div>
                    <div class="accordion-body">
                        <p><strong>Adresse</strong><br>${App.t('infos_adresse', 'À compléter')}</p>
                        <p><strong>Ouverture</strong><br>${App.t('infos_horaires', 'Vendredi 19h → Dimanche 15h')}</p>
                        <p><strong>En voiture</strong><br>${App.t('infos_voiture', 'Parking sur place. Voir Covoit pour les trajets groupés.')}</p>
                        <p><strong>En train</strong><br>${App.t('infos_train', 'Voir Covoit pour les pickups gare.')}</p>
                    </div>
                </div>
                <div class="accordion">
                    <div class="accordion-header">Quoi apporter ${icons.chevronDown}</div>
                    <div class="accordion-body">
                        <p><strong>Si tu dors à l'intérieur</strong></p>
                        <ul>${App.t('infos_items_interieur', 'Duvet ou couverture\nOreiller\nServiette')
                            .split('\n').map(i => `<li>${i}</li>`).join('')}</ul>
                        <p><strong>Si tu dors en tente</strong></p>
                        <ul>${App.t('infos_items_tente', 'Tente\nDuvet chaud\nTapis de sol')
                            .split('\n').map(i => `<li>${i}</li>`).join('')}</ul>
                        <p><strong>Pour tout le monde</strong></p>
                        <ul>${App.t('infos_items_commun', 'Vêtements chauds pour la nuit\nDéguisement ✨')
                            .split('\n').map(i => `<li>${i}</li>`).join('')}</ul>
                    </div>
                </div>
                <div class="accordion">
                    <div class="accordion-header">Repas &amp; boissons ${icons.chevronDown}</div>
                    <div class="accordion-body">
                        <p>${App.t('infos_repas', 'Les repas sont organisés collectivement — voir Shifts pour savoir quand tu cuisines.')}</p>
                        <p>${App.t('infos_bar', 'Le bar est assuré par l\'équipe en shifts.')}</p>
                    </div>
                </div>
                <div class="accordion">
                    <div class="accordion-header">À savoir ${icons.chevronDown}</div>
                    <div class="accordion-body">
                        ${App.t('infos_a_savoir', 'Respect des lieux et des voisins.\nVendredi les organisatrices sont occupées — prends ton autonomie.\nBienveillance et care.')
                            .split('\n').map(l => `<p>${l}</p>`).join('')}
                    </div>
                </div>
            </div>
            ${repasHtml}
            <p class="section-label">Plus</p>
            <div data-nav="deguisements" class="link-card">
                <div class="link-card-icon">${icons.star}</div>
                <div>
                    <div class="link-card-label">Déguisements</div>
                    <div class="link-card-sub">Inspi & références</div>
                </div>
            </div>
            <a class="link-card"
               href="https://drive.google.com/drive/folders/1TQeQmUi_dqUGA__mUK0F-CUq2ApxHiGW?usp=sharing"
               target="_blank" rel="noopener">
                <div class="link-card-icon">${icons.photo}</div>
                <div>
                    <div class="link-card-label">Photos</div>
                    <div class="link-card-sub">Album Google Drive</div>
                </div>
            </a>`;
    },

    shifts: (cuisine, bar) => {
        const cuisineBySlot = {};
        cuisine.forEach(r => (cuisineBySlot[r.slot] = cuisineBySlot[r.slot] || []).push(r.nom));

        const barByNight = {};
        bar.forEach(r => {
            if (!barByNight[r.nuit]) barByNight[r.nuit] = {};
            (barByNight[r.nuit][r.tranche] = barByNight[r.nuit][r.tranche] || []).push(r.nom);
        });

        const cuisineHtml = Object.keys(cuisineBySlot).length ? `
            <div class="shifts-block">
                <div class="shifts-title">Cuisine</div>
                <table class="shifts-table">
                    <thead><tr><th>Slot</th><th>Équipe</th></tr></thead>
                    <tbody>
                        ${Object.entries(cuisineBySlot).map(([slot, noms]) => `
                            <tr>
                                <td class="shift-slot">${slot}</td>
                                <td><div class="shift-names">
                                    ${noms.map(n => `<span class="shift-tag">${n}</span>`).join('')}
                                </div></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>` : '';

        const barHtml = Object.entries(barByNight).map(([nuit, tranches]) => `
            <div class="shifts-block">
                <div class="shifts-title">Bar — ${nuit}</div>
                <table class="shifts-table">
                    <thead><tr><th>Tranche</th><th>Équipe</th></tr></thead>
                    <tbody>
                        ${Object.entries(tranches).map(([t, noms]) => `
                            <tr>
                                <td class="shift-slot">${t}</td>
                                <td><div class="shift-names">
                                    ${noms.map(n => `<span class="shift-tag">${n}</span>`).join('')}
                                </div></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`).join('');

        return cuisineHtml + barHtml
            || '<div class="empty-state">Les shifts ne sont pas encore définis</div>';
    },

    covoit: (voitures, passagers, train) => {
        const paxByDriver = {};
        passagers.forEach(p => (paxByDriver[p.conducteur] = paxByDriver[p.conducteur] || []).push(p));

        const voituresHtml = voitures.length ? `
            <p class="section-label">Voitures</p>
            <div class="covoit-block">
                ${voitures.map(v => `
                    <div class="car-card">
                        <div class="car-conductor">${v.conducteur}</div>
                        <div class="car-meta">
                            ${[v.lieu_depart, v.heure_depart].filter(Boolean).join(' · ')}
                            ${v.heure_arrivee_festival ? ` → arrivée ${v.heure_arrivee_festival}` : ''}
                        </div>
                        <span class="car-badge">${v.nb_places} place${v.nb_places > 1 ? 's' : ''}</span>
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
                        ${t.conducteur_pickup ? `<div class="car-meta">Pickup : ${t.conducteur_pickup}</div>` : ''}
                    </div>`).join('')}
            </div>` : '';

        return voituresHtml + trainHtml
            || '<div class="empty-state">Le covoiturage n\'est pas encore défini</div>';
    },

    dodo: (rows) => {
        const schemaUrl = App.t('plan_dodo_schema_url', '');

        const listeHtml = rows.length
            ? (() => {
                const sorted = [...rows].sort((a, b) =>
                    (a.occupant || '').localeCompare(b.occupant || '', 'fr')
                );
                return `<div class="dodo-list">
                    ${sorted.map(r => `
                        <div class="dodo-row">
                            <div class="dodo-name">${r.occupant || '—'}</div>
                            <div class="dodo-info">
                                <div class="dodo-chambre">${r.chambre}</div>
                                <div class="dodo-gite">${r.gite} · ${r.etage}</div>
                            </div>
                        </div>`).join('')}
                </div>`;
            })()
            : '<div class="empty-state">Le plan dodo n\'est pas encore défini</div>';

        const schemaHtml = schemaUrl
            ? `<div class="dodo-schema-wrap"><img src="${schemaUrl}" alt="Plan des chambres" class="dodo-schema-img"></div>`
            : '<div class="empty-state">Schéma à venir</div>';

        return `
            <div class="dodo-tabs">
                <button class="day-tab active" data-panel="liste">Liste</button>
                <button class="day-tab" data-panel="schema">Schéma</button>
            </div>
            <div class="day-panel" data-panel="liste">${listeHtml}</div>
            <div class="day-panel hidden" data-panel="schema">${schemaHtml}</div>`;
    },

    deguisements: () => `
        <p class="deg-intro">
            ${App.t('deguisements_intro',
                'Samedi journée et soir c\'est le moment fort — mais tu peux en porter tout le weekend si t\'as envie. Aucune obligation, juste une invitation à mettre un peu de folie.'
            )}
        </p>
        <div class="deg-gallery">
            <div class="empty-state" style="grid-column:span 2;padding:32px 0">Images à venir</div>
        </div>`,
};


/* ─── Icons ──────────────────────────────────────────────────────────────────── */
const icons = {
    music:       `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    clock:       `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15,15"/></svg>`,
    home_:       `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
    car:         `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="9" width="22" height="9" rx="2"/><path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
    star:        `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`,
    info:        `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="8" stroke-width="2.5"/><line x1="12" y1="12" x2="12" y2="16"/></svg>`,
    photo:       `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`,
    chevron:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9,18 15,12 9,6"/></svg>`,
    chevronDown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>`,
};


/* ─── Boot ───────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => App.init());
