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

## Interface festivalier

5 rubriques accessibles depuis la nav :

| Rubrique | Contenu |
|---|---|
| **Accueil** | 4 cards rubriques avec photo, accordéon "À savoir", accordéon Déguisements |
| **Programme** | 2 onglets Vendredi/Samedi, tous items cliquables (DJ, repas, animation) |
| **Catering** | Good to know repas/bar + onglets Menu / Shifts |
| **Logistique** | Good to know adresse/trajet + onglets Voiture (grid) / Train |
| **Dodo** | Good to know couchage + onglets Liste alphabétique / Schéma (pannable) |

## Interface admin

6 onglets : Montage, Inventaire, Prog, Équipes, Covoit, Todo.
Édition inline sur les noms d'équipes, checkboxes sauvegardées en temps réel dans Sheets.

## Structure

```
Astrolab/
├── index.html          — shell HTML (login + app + modal)
├── style.css           — design system
├── js/
│   ├── config.js       — API URL + mots de passe + cache TTL
│   ├── api.js          — Api.get() / Api.write() avec cache 5 min
│   ├── admin.js        — nav et templates admin
│   └── app.js          — logique + templates festivalier
├── api/
│   └── Code.gs         — Apps Script (doGet, handleWrite, sheetToJson)
└── assets/
    ├── images/         — photos cards accueil, portraits DJ, inventaire, login-bg
    └── schemas/        — plan dodo, schémas montage
```

## Mettre à jour le contenu

**Données** → éditer directement dans Google Sheets, l'app recharge depuis l'API.

**Images** → uploader dans `assets/images/` via GitHub, puis mettre l'URL complète dans Sheets :
```
https://astridkzn.github.io/astrolab/assets/images/nom-du-fichier.jpg
```

**Textes éditoriaux** (adresse, infos pratiques, intro déguisements…) → onglet `textes` dans Sheets.

### Clés textes importantes

| Clé | Usage |
|---|---|
| `accueil_*_image` | Photos des 4 cards d'accueil (programme, catering, logistique, dodo) |
| `infos_a_savoir` | Accordéon "À savoir" sur l'accueil |
| `deguisements_intro` | Intro accordéon déguisements |
| `deguisements_drive_url` | Lien Google Drive photos |
| `infos_repas` / `infos_bar` | Good to know Catering |
| `infos_adresse` / `infos_voiture` / `infos_train` | Good to know Logistique |
| `infos_item_interieur` / `infos_items_tente` | Good to know Dodo |
| `plan_dodo_schema_url` | URL du schéma plan dodo |

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

- [ ] Remplir les onglets Sheets : shifts, plan dodo, covoit, montage, todo
- [ ] Remplir l'onglet `textes` : toutes les clés listées ci-dessus
- [ ] Ajouter les assets : photos cards accueil, schéma dodo, images inventaire, galerie déguisements
- [ ] Remplir `deguisements_images` avec les image_url de la galerie
- [ ] Ajouter colonne `note` dans `lineup` pour descriptions repas/animations
- [ ] Ajouter `heure_retour` / `lieu_retour` dans `covoit_voitures`
- [ ] Formulaire covoit festivalier (s'inscrire conducteur/passager)
- [ ] DA desktop à définir
