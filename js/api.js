const Api = {
    _cache: {},

    async get(tab) {
        const now = Date.now();
        const hit = this._cache[tab];
        if (hit && now - hit.ts < CONFIG.CACHE_TTL) return hit.data;

        const res  = await fetch(`${CONFIG.API_URL}?tab=${tab}`);
        if (!res.ok) throw new Error(`API ${res.status}`);

        const json = await res.json();
        const data = json[tab] ?? [];
        this._cache[tab] = { ts: now, data };
        return data;
    },

    async write(params) {
        const url = `${CONFIG.API_URL}?${new URLSearchParams(params)}`;
        // Invalide le cache de l'onglet concerné
        const tab = params.tab ?? (params.action === 'append_todo' ? 'todo' : null);
        if (tab) delete this._cache[tab];

        try {
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            return { ok: false, error: e.message };
        }
    },
};
