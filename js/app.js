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
        this._preloadAtLogin();
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
        this._initScrollFabs();
        this.go(role === 'admin' ? 'montage' : 'home');
        this._prefetchAll(role);
    },

    _initScrollFabs() {
        const main = document.getElementById('app-main');
        main.addEventListener('scroll', () => this._updateScrollFabs(), { passive: true });
        document.getElementById('fab-down').addEventListener('click', () => {
            main.scrollBy({ top: 300, behavior: 'smooth' });
        });
        document.getElementById('fab-up').addEventListener('click', () => {
            main.scrollTo({ top: 0, behavior: 'smooth' });
        });
    },

    _updateScrollFabs() {
        const main    = document.getElementById('app-main');
        const scrolled   = main.scrollTop > 80;
        const canScroll  = main.scrollHeight > main.clientHeight + 40;
        document.getElementById('fab-down').classList.toggle('hidden', scrolled || !canScroll);
        document.getElementById('fab-up').classList.toggle('hidden', !scrolled);
    },

    _preloadAtLogin() {
        const tabs = ['textes', 'lineup', 'repas', 'shifts_cuisine', 'shifts_bar',
                      'plan_dodo', 'covoit_voitures', 'covoit_passagers', 'covoit_train',
                      'montage_tasks', 'inventaire', 'todo'];
        tabs.forEach(tab => Api.get(tab).catch(() => {}));
    },

    _prefetchAll(role) {
        const tabs = role === 'admin'
            ? ['montage_tasks', 'inventaire', 'lineup', 'repas', 'shifts_cuisine',
               'shifts_bar', 'plan_dodo', 'covoit_voitures', 'covoit_passagers', 'covoit_train', 'todo']
            : ['lineup', 'repas', 'shifts_cuisine', 'shifts_bar',
               'covoit_voitures', 'covoit_passagers', 'covoit_train', 'plan_dodo'];
        tabs.forEach(tab => Api.get(tab).catch(() => {}));
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
            home: 'Accueil', programme: 'Programme', catering: 'Catering',
            logistique: 'Logistique', dodo: 'Plan dodo',
            montage: 'Montage', inventaire: 'Inventaire', prog: 'Programme',
            equipes: 'Équipes', todo: 'Todo',
        };
        document.getElementById('header-title').textContent = labels[view] ?? view;
        document.getElementById('app-main').scrollTop = 0;
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

        this._updateScrollFabs();
    },

    async _renderFestivalier(view, main) {
        switch (view) {
            case 'home':        await this._renderHome(main);        break;
            case 'programme':   await this._renderProgramme(main);   break;
            case 'catering':    await this._renderCatering(main);    break;
            case 'logistique':  await this._renderLogistique(main);  break;
            case 'dodo':        await this._renderDodo(main);        break;
            default:            main.innerHTML = '<div class="empty-state">À venir</div>';
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

    async _renderHome(main) {
        main.innerHTML = Tpl.home();
        this._bindAccordions(main);
    },

    async _renderProgramme(main) {
        const lineup = await Api.get('lineup');
        this._lineup = lineup;

        const days  = ['Vendredi', 'Samedi'];
        const byDay = { Vendredi: [], Samedi: [] };
        lineup.forEach((set, idx) => {
            set._idx = idx;
            if (byDay[set.jour] !== undefined) byDay[set.jour].push(set);
        });

        main.innerHTML = Tpl.programme(days, byDay, true);
        this._bindTabs(main);
        main.querySelectorAll('.set-card').forEach(card => {
            card.addEventListener('click', () => {
                const set = this._lineup[parseInt(card.dataset.idx)];
                if (set) this._openModal(set);
            });
        });
    },

    async _renderCatering(main) {
        const [repas, cuisine, bar] = await Promise.all([
            Api.get('repas'), Api.get('shifts_cuisine'), Api.get('shifts_bar'),
        ]);
        main.innerHTML = Tpl.catering(repas, cuisine, bar);
        this._bindTabs(main);
        this._bindAccordions(main);
    },

    async _renderLogistique(main) {
        const [voitures, passagers, train] = await Promise.all([
            Api.get('covoit_voitures'), Api.get('covoit_passagers'), Api.get('covoit_train'),
        ]);
        main.innerHTML = Tpl.logistique(voitures, passagers, train);
        this._bindTabs(main);
        this._bindAccordions(main);
    },

    async _renderDodo(main) {
        const rows = await Api.get('plan_dodo');
        main.innerHTML = Tpl.dodo(rows);
        this._bindTabs(main);
        this._bindFilters(main);
        this._bindAccordions(main);
    },


    // ── Admin views ───────────────────────────────────────────────────────────

    async _renderAdminMontage(main) {
        const [tasks, inventaire] = await Promise.all([
            Api.get('montage_tasks'), Api.get('inventaire'),
        ]);
        main.innerHTML = AdminTpl.montage(tasks, inventaire);
        this._bindTabs(main);
        this._bindMontageExpand(main);
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
        main.querySelectorAll('.set-card').forEach(card => {
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
        this._bindFilters(main);
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
                tab.classList.remove('day-tab--pulse');
                const panel = container.querySelector(`.day-panel[data-panel="${tab.dataset.panel}"]`);
                if (panel) panel.classList.remove('hidden');
            });
        });
    },

    _bindAccordions(container) {
        container.querySelectorAll('.accordion-header').forEach(h => {
            h.addEventListener('click', () => h.closest('.accordion').classList.toggle('open'));
        });
    },

    _bindFilters(container) {
        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const group = btn.closest('.filter-group');
                if (!group) return;
                group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                group.querySelectorAll('.filter-panel').forEach(p => p.classList.add('hidden'));
                btn.classList.add('active');
                const panel = group.querySelector(`.filter-panel[data-filter="${btn.dataset.filter}"]`);
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

    _bindMontageExpand(container) {
        container.addEventListener('click', e => {
            const task = e.target.closest('.montage-task.has-detail');
            if (!task) return;
            task.classList.toggle('open');
            const body = task.querySelector('.montage-task-body');
            if (body) body.classList.toggle('hidden');
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
            if (!tache) { input.focus(); return; }

            confirmBtn.disabled = true;
            await Api.write({ action: 'append_todo', tache, categorie });
            await this._renderAdminTodo(main);
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') confirmBtn.click();
        });
    },


    // ── Modal ─────────────────────────────────────────────────────────────────

    _openModal(set) {
        document.getElementById('modal-body').innerHTML = Tpl.itemModal(set);
        document.getElementById('dj-modal').classList.remove('hidden');
    },

    _closeModal() {
        document.getElementById('dj-modal').classList.add('hidden');
    },
};


/* ─── Phone normalizer ──────────────────────────────────────────────────────── */
const normalizePhone = (phone) => {
    if (!phone) return '';
    const s = String(phone).replace(/[\s.\-]/g, '');
    if (/^\d{9}$/.test(s)) return '0' + s;
    return s;
};


/* ─── Templates festivalier ──────────────────────────────────────────────────── */
const Tpl = {

    loading: () => `
        <div class="loading-state">
            <div class="spinner"></div>
            <span>ça arrive...</span>
        </div>`,

    home: () => {
        const cards = [
            { nav: 'programme',  label: 'Programme',  imgKey: 'accueil_programme_image'  },
            { nav: 'catering',   label: 'Catering',   imgKey: 'accueil_catering_image'   },
            { nav: 'logistique', label: 'Logistique', imgKey: 'accueil_logistique_image' },
            { nav: 'dodo',       label: 'Plan dodo',  imgKey: 'accueil_dodo_image'       },
        ];

        const cardsHtml = cards.map(c => {
            const imgUrl = App.t(c.imgKey, '');
            return `
                <div class="home-card" data-nav="${c.nav}">
                    <div class="home-card-header">
                        <span class="home-card-label">${c.label}</span>
                        <span class="home-card-arrow">${icons.chevron}</span>
                    </div>
                    <div class="home-card-photo">
                        ${imgUrl
                            ? `<img src="${imgUrl}" alt="${c.label}"
                                   onerror="this.closest('.home-card-photo').classList.add('empty')">`
                            : ''
                        }
                    </div>
                </div>`;
        }).join('');

        const aSavoir = App.t('infos_a_savoir', '');
        const gtnHtml = aSavoir ? `
            <div class="gtn-wrap">
                <div class="accordion">
                    <div class="accordion-header"><span class="accordion-warn">${icons.warn}</span>À savoir ${icons.chevronDown}</div>
                    <div class="accordion-body">
                        ${aSavoir.split('\n').map(l => `<p>${fmt(l)}</p>`).join('')}
                    </div>
                </div>
            </div>` : '';

        const degIntro = App.t('deguisements_intro', '');
        const driveUrl = App.t('deguisements_drive_url',
            'https://drive.google.com/drive/folders/1TQeQmUi_dqUGA__mUK0F-CUq2ApxHiGW?usp=sharing'
        );
        const degHtml = `
            <div class="gtn-wrap">
                <div class="accordion">
                    <div class="accordion-header">Déguisements ${icons.chevronDown}</div>
                    <div class="accordion-body">
                        ${degIntro ? `<p class="deg-intro-text">${fmt(degIntro)}</p>` : ''}
                    </div>
                </div>
            </div>`;

        const photosIntro = App.t('photos_intro', '');
        const photosHtml = `
            <div class="gtn-wrap">
                <div class="accordion">
                    <div class="accordion-header">Photos ${icons.chevronDown}</div>
                    <div class="accordion-body">
                        ${photosIntro ? `<p class="deg-intro-text">${fmt(photosIntro)}</p>` : ''}
                        <a class="deg-drive-link" href="${driveUrl}" target="_blank" rel="noopener">
                            ${icons.photo}&nbsp; Album Drive →
                        </a>
                    </div>
                </div>
            </div>`;

        return `
            <div class="home-grid">${cardsHtml}</div>
            ${gtnHtml}
            ${degHtml}
            ${photosHtml}`;
    },

    programme: (days, byDay, centered = false) => `
        <div class="day-tabs${centered ? ' day-tabs--centered' : ''}">
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
        const type  = (set.type || 'info').toLowerCase();
        const scene = [set.scene, type !== 'dj' ? set.type : ''].filter(Boolean).join(' · ');
        return `
            <div class="set-card type-${type} clickable" data-idx="${set._idx}">
                <div class="set-time">${set.heure_debut}</div>
                <div class="set-info">
                    <div class="set-name">${set.nom}</div>
                    ${scene ? `<div class="set-detail">${scene}</div>` : ''}
                    ${set.style ? `<div class="set-style">${set.style}</div>` : ''}
                </div>
                <div class="set-arrow">${icons.chevron}</div>
            </div>`;
    },

    itemModal: (set) => `
        ${set.image_url
            ? `<img src="${set.image_url}" alt="${set.nom}" class="dj-portrait"
                    onerror="this.style.display='none'">`
            : ''
        }
        <div class="dj-name">${set.nom}</div>
        ${set.style ? `<div class="dj-style">${set.style}</div>` : ''}
        ${set.note  ? `<div class="item-note">${set.note}</div>`  : ''}
        <div class="dj-tags">
            ${set.heure_debut && set.heure_fin
                ? `<span class="dj-tag">${set.heure_debut} → ${set.heure_fin}</span>`
                : ''}
            ${set.scene    ? `<span class="dj-tag">${set.scene}</span>`    : ''}
            ${set.type && set.type !== 'DJ' ? `<span class="dj-tag">${set.type}</span>` : ''}
            ${set.materiel ? `<span class="dj-tag">${set.materiel}</span>` : ''}
        </div>
        ${set.soundcloud_url
            ? `<a class="sc-link" href="${set.soundcloud_url}" target="_blank" rel="noopener">
                   ${icons.headphones}&nbsp; Écouter sur SoundCloud →
               </a>`
            : ''}`,

    catering: (repas, cuisine, bar) => {
        const repasInfo = App.t('infos_repas', '');
        const barInfo   = App.t('infos_bar', '');

        const gtnContent = [
            repasInfo ? `<p>${fmt(repasInfo)}</p>` : '',
            barInfo   ? `<p>${fmt(barInfo)}</p>`   : '',
        ].filter(Boolean).join('');

        const gtnHtml = gtnContent ? `
            <div class="gtn-wrap">
                <div class="accordion">
                    <div class="accordion-header"><span class="accordion-warn">${icons.warn}</span>À savoir ${icons.chevronDown}</div>
                    <div class="accordion-body">${gtnContent}</div>
                </div>
            </div>` : '';

        const byDay = {};
        repas.forEach(r => (byDay[r.jour] = byDay[r.jour] || []).push(r));

        const menuHtml = Object.keys(byDay).length
            ? `<div class="menu-wrap">
                   ${Object.entries(byDay).map(([jour, plats]) => `
                       <div class="meal-day-title">${jour}</div>
                       <div class="repas-block">
                           ${plats.map(p => `
                               <div class="repas-row">
                                   <span class="repas-moment">${p.moment}</span>
                                   <span class="repas-plat">${p.plat}</span>
                                   ${p.allergenes
                                       ? `<span class="repas-allergenes">${p.allergenes}</span>`
                                       : ''}
                               </div>`).join('')}
                       </div>`).join('')}
               </div>`
            : '<div class="empty-state">Menu à venir</div>';

        return `
            ${gtnHtml}
            <div class="day-tabs">
                <button class="day-tab active" data-panel="menu">Menu</button>
                <button class="day-tab day-tab--pulse" data-panel="shifts">Shifts</button>
            </div>
            <div class="day-panel" data-panel="menu">${menuHtml}</div>
            <div class="day-panel hidden" data-panel="shifts">${Tpl.shifts(cuisine, bar)}</div>`;
    },

    logistique: (voitures, passagers, train) => {
        const paxByDriver = {};
        passagers.forEach(p => (paxByDriver[p.conducteur] = paxByDriver[p.conducteur] || []).push(p));

        const voituresHtml = voitures.length
            ? `<div class="covoit-grid">
                   ${voitures.map(v => {
                       const pax     = paxByDriver[v.conducteur] || [];
                       const total   = parseInt(v.nb_places) || 0;
                       const nbAller = pax.filter(p =>
                           p.trajet === 'Aller' || p.trajet === 'Aller-Retour').length;
                       const nbRetour = pax.filter(p =>
                           p.trajet === 'Retour' || p.trajet === 'Aller-Retour').length;
                       const libresAller  = total - nbAller;
                       const libresRetour = total - nbRetour;
                       return `
                       <div class="car-card">
                           <div class="car-card-top">
                               <div class="car-conductor">${v.conducteur}</div>
                               <span class="car-badge">
                                   ${v.nb_places} place${v.nb_places > 1 ? 's' : ''}
                               </span>
                           </div>
                           ${v.telephone
                               ? `<a class="car-phone" href="tel:${normalizePhone(v.telephone)}">
                                      ${icons.phone} ${normalizePhone(v.telephone)}
                                  </a>`
                               : ''}
                           <div class="car-avail">↑ ${libresAller} libre${libresAller > 1 ? 's' : ''} · ↓ ${libresRetour} libre${libresRetour > 1 ? 's' : ''}</div>
                           ${(v.lieu_depart || v.heure_depart) ? `
                               <div class="car-trip">
                                   <span class="car-trip-label">Aller</span>
                                   <span class="car-trip-val">
                                       ${[v.lieu_depart, v.heure_depart].filter(Boolean).join(' · ')}
                                   </span>
                               </div>` : ''}
                           ${(v.lieu_retour || v.heure_retour) ? `
                               <div class="car-trip">
                                   <span class="car-trip-label">Retour</span>
                                   <span class="car-trip-val">
                                       ${[v.lieu_retour, v.heure_retour].filter(Boolean).join(' · ')}
                                   </span>
                               </div>` : ''}
                           ${pax.length ? `
                               <div class="car-passengers">
                                   <div class="car-passengers-label">Passagers</div>
                                   ${pax.map(p => `
                                       <div class="passenger-row">
                                           <span>${p.nom_passager}</span>
                                           <span class="passenger-trajet">${p.trajet}</span>
                                       </div>`).join('')}
                               </div>` : ''}
                       </div>`;
                   }).join('')}
               </div>`
            : '<div class="empty-state">Aucune voiture définie</div>';

        const trainHtml = train.length
            ? `<div class="train-list">
                   ${train.map(t => `
                       <div class="train-row">
                           <div class="train-name">${t.nom}</div>
                           ${t.heure_depart_train ? `
                               <div class="train-info">
                                   Départ train · ${[t.jour_aller, t.heure_depart_train].filter(Boolean).join(' ')}
                               </div>` : ''}
                           ${t.heure_retour_train ? `
                               <div class="train-info">Retour train · ${[t.jour_retour, t.heure_retour_train].filter(Boolean).join(' ')}</div>` : ''}
                           ${t.conducteur_pickup ? `
                               <div class="train-pickup">
                                   Pickup pour l'aller : ${t.conducteur_pickup}
                               </div>` : ''}
                       </div>`).join('')}
               </div>`
            : '<div class="empty-state">Aucune info train</div>';

        const adresse     = App.t('infos_adresse', '');
        const voitureInfo = App.t('infos_voiture', '');
        const trainInfo   = App.t('infos_train', '');

        const gtnContent = [
            adresse     ? `<p><strong>Adresse</strong><br>${fmt(adresse)}</p>`        : '',
            voitureInfo ? `<p><strong>En voiture</strong><br>${fmt(voitureInfo)}</p>` : '',
            trainInfo   ? `<p><strong>En train</strong><br>${fmt(trainInfo)}</p>`     : '',
        ].filter(Boolean).join('');

        const gtnHtml = gtnContent ? `
            <div class="gtn-wrap">
                <div class="accordion">
                    <div class="accordion-header">Infos pratiques ${icons.chevronDown}</div>
                    <div class="accordion-body">${gtnContent}</div>
                </div>
            </div>` : '';

        return `
            ${gtnHtml}
            <div class="day-tabs">
                <button class="day-tab active" data-panel="voiture">Je viens en voiture</button>
                <button class="day-tab" data-panel="train">Je viens en train</button>
            </div>
            <div class="day-panel" data-panel="voiture">${voituresHtml}</div>
            <div class="day-panel hidden" data-panel="train">${trainHtml}</div>`;
    },

    dodo: (rows) => {
        const gite1Url   = App.t('plan_dodo_schema_gite1', '');
        const gite2RdcUrl = App.t('plan_dodo_schema_gite2_rdc', '');
        const gite21erUrl = App.t('plan_dodo_schema_gite2_1er', '');
        const interieur  = App.t('infos_items_interieur', '');
        const tente      = App.t('infos_items_tente', '');
        const commun     = App.t('infos_items_commun', '');

        const gtnContent = [
            interieur ? `
                <p><strong>Si tu dors à l'intérieur</strong></p>
                <ul>${interieur.split('\n').map(i => `<li>${fmt(i)}</li>`).join('')}</ul>` : '',
            tente ? `
                <p><strong>Si tu dors en tente</strong></p>
                <ul>${tente.split('\n').map(i => `<li>${fmt(i)}</li>`).join('')}</ul>` : '',
            commun ? `
                <p><strong>Pour tout le monde</strong></p>
                <ul>${commun.split('\n').map(i => `<li>${fmt(i)}</li>`).join('')}</ul>` : '',
        ].filter(Boolean).join('');

        const gtnHtml = gtnContent ? `
            <div class="gtn-wrap">
                <div class="accordion">
                    <div class="accordion-header"><span class="accordion-warn">${icons.warn}</span>À savoir ${icons.chevronDown}</div>
                    <div class="accordion-body">${gtnContent}</div>
                </div>
            </div>` : '';

        const renderDodoRow = (r) => `
            <div class="dodo-row">
                <div class="dodo-name">${r.occupant || '—'}</div>
                <div class="dodo-info">
                    <div class="dodo-chambre">${r.chambre}</div>
                    <div class="dodo-gite">${r.gite} · ${r.etage}</div>
                    ${r.config_lit ? `<div class="dodo-lit">${r.config_lit}${
                        /matelas/i.test(r.config_lit)
                            ? ' · <span class="dodo-lit-duvet">prends ton duvet !</span>'
                            : ''
                    }</div>` : ''}
                </div>
            </div>`;

        const sorted     = [...rows].sort((a, b) => (a.occupant || '').localeCompare(b.occupant || '', 'fr'));
        const sortedRoom = [...rows].sort((a, b) => {
            const g = (a.gite || '').localeCompare(b.gite || '', 'fr');
            if (g !== 0) return g;
            return (a.chambre || '').localeCompare(b.chambre || '', 'fr');
        });

        const makeList = (items) => items.length
            ? `<div class="dodo-list">${items.map(renderDodoRow).join('')}</div>`
            : '<div class="empty-state">Plan dodo à venir</div>';

        const listeHtml = `
            <div class="filter-group">
                <div class="filter-tabs">
                    <button class="filter-btn active" data-filter="alpha">A → Z</button>
                    <button class="filter-btn" data-filter="chambre">Par chambre</button>
                </div>
                <div class="filter-panel" data-filter="alpha">${makeList(sorted)}</div>
                <div class="filter-panel hidden" data-filter="chambre">${makeList(sortedRoom)}</div>
            </div>`;

        const schemaPanel = (url, label) => url
            ? `<div class="schema-viewport schema-viewport--full">
                   <img src="${url}" alt="${label}" class="schema-img">
               </div>`
            : '<div class="empty-state">Schéma à venir</div>';

        return `
            ${gtnHtml}
            <div class="day-tabs">
                <button class="day-tab active" data-panel="liste">Répartition</button>
                <button class="day-tab" data-panel="gite1">Gîte 1</button>
                <button class="day-tab" data-panel="gite2rdc">Gîte 2 RDC</button>
                <button class="day-tab" data-panel="gite21er">Gîte 2 1er</button>
            </div>
            <div class="day-panel" data-panel="liste">${listeHtml}</div>
            <div class="day-panel hidden" data-panel="gite1">${schemaPanel(gite1Url, 'Plan Gîte 1')}</div>
            <div class="day-panel hidden" data-panel="gite2rdc">${schemaPanel(gite2RdcUrl, 'Plan Gîte 2 RDC')}</div>
            <div class="day-panel hidden" data-panel="gite21er">${schemaPanel(gite21erUrl, 'Plan Gîte 2 — 1er étage')}</div>`;
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
};


/* ─── Text formatter ────────────────────────────────────────────────────────── */
const fmt = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
};


/* ─── Icons ──────────────────────────────────────────────────────────────────── */
const icons = {
    music:       `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    utensils:    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3"/><line x1="21" y1="15" x2="21" y2="22"/></svg>`,
    mapPin:      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    moon:        `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
    home_:       `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
    photo:       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`,
    chevron:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9,18 15,12 9,6"/></svg>`,
    chevronDown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>`,
    warn:        `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    star:        `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`,
    info:        `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="8" stroke-width="2.5"/><line x1="12" y1="12" x2="12" y2="16"/></svg>`,
    car:         `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="9" width="22" height="9" rx="2"/><path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
    clock:       `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15,15"/></svg>`,
    phone:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>`,
    headphones:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3z"/><path d="M3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>`,
};


/* ─── Boot ───────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => App.init());
