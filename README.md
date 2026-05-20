# Astrolab — App festival Astro 2026

Web app de gestion pour un festival privé de 3 jours. Deux profils : **admin** (organisatrices) et **festivalier** (participants).

**Live** → [astridkzn.github.io/astrolab](https://astridkzn.github.io/astrolab)

---

## Stack

- **Frontend** — HTML/CSS/JS vanilla, hébergé sur GitHub Pages
- **Données** — Google Sheets (ID : `1Op0O3sUWPec0cjNENKbRfO3RKvphkCJo79Vr_pxfjb8`)
- **API** — Google Apps Script (`api/Code.gs`) exposé en `doGet`
- **Images** — `assets/images/` servi via GitHub Pages

## Accès

| Profil | Mot de passe |
|---|---|
| Admin | `astro-admin2025` |
| Festivalier | `astro2025` |

## Structure

```
Astrolab/
├── index.html          — shell HTML (login + app + modal DJ)
├── style.css           — design system
├── js/
│   ├── config.js       — API URL + mots de passe + cache TTL
│   ├── api.js          — Api.get() / Api.write() avec cache 5 min
│   ├── admin.js        — nav et templates admin
│   └── app.js          — logique + templates festivalier
├── api/
│   └── Code.gs         — Apps Script (doGet, handleWrite, sheetToJson)
└── assets/
    ├── images/         — portraits DJ, inventaire, galerie déguisements, login-bg
    └── schemas/        — plan dodo, schémas montage
```

## Mettre à jour le contenu

**Données** → éditer directement dans Google Sheets, l'app recharge depuis l'API.

**Images** → uploader dans `assets/images/` via GitHub, puis mettre l'URL complète dans Sheets :
```
https://astridkzn.github.io/astrolab/assets/images/nom-du-fichier.jpg
```

**Textes éditoriaux** (adresse, infos pratiques, intro déguisements…) → onglet `textes` dans Sheets.

## Déployer une mise à jour du code

```bash
git add .
git commit -m "Description du changement"
git push
```

GitHub Pages se met à jour automatiquement en 1-2 minutes.

## Branches

| Branche | Description |
|---|---|
| `main` | DA sobre — fond sombre, violet |
| `da-techno` | DA techno — magenta, IBM Plex Mono, glow |

Pour changer la DA active : **GitHub → Settings → Pages → changer la branche source**.

## À faire

- [ ] Remplir les onglets Sheets : shifts, plan dodo, covoit, todo, montage
- [ ] Remplir l'onglet `textes` : adresse, horaires, infos pratiques
- [ ] Ajouter les assets : schémas gîtes, images inventaire, galerie déguisements
- [ ] Formulaire covoit festivalier (s'inscrire conducteur/passager)
- [ ] DA desktop à définir
