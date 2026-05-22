# Astrolab — Contexte projet

## C'est quoi
Web app de gestion pour un festival privé de 3 jours ("Astro"), organisé par Astrid et une co-orga.
Deux profils : **admin** (les deux organisatrices) et **festivalier** (tous les participants).

---

## Stack technique
- **Google Sheets** — source de données (import initial + édition lourde)
- **Google Apps Script** — API exposée en doGet (lecture `?tab=`, écriture `?action=`)
- **GitHub Pages** — hébergement (pas encore déployé)
- **Google Drive** — stockage des images et schémas
- Zéro nouveau compte nécessaire (tout sur le compte Google d'Astrid + GitHub existant)

---

## Auth
- Un seul lien, deux mots de passe : **astro-admin2025** / **astro2025** → deux interfaces différentes
- Passwords définis dans `js/config.js` → `CONFIG.PASSWORDS`

---

## Structure de la webapp

### Admin — Bottom nav (6 onglets)
| Onglet | Contenu | Éditable dans l'app |
|---|---|---|
| Montage | 3 teams, tâches par catégorie, schémas | ❌ lecture seule |
| Inventaire | Cards filtrables, code couleur propriétaire | ✅ coche "Récupéré" |
| Prog | Lineup DJ + récap repas détaillé | ❌ |
| Équipes | Shifts cuisine + shifts bar + plan dodo | ✅ noms éditables inline |
| Covoit | Voitures avec numéro de téléphone conducteur | ❌ |
| Todo | Checklist par catégorie + ajout à la volée | ✅ ajout + coche "Fait" |

### Festivalier — Homepage cards → sections
| Section | Contenu | Notes |
|---|---|---|
| Programme | Timeline par jour, blocs typés, portrait DJ au tap | Dynamique depuis Sheets |
| Infos | 4 accordions : Comment venir / Quoi apporter / Repas & Boissons / À savoir | Contenu éditable via onglet `textes` dans Sheets |
| Plan dodo | Liste alphabétique + schéma | Schéma fourni via `plan_dodo_schema_url` dans `textes` |
| Shifts | Shifts cuisine + bar, lecture seule | — |
| Covoit | Voitures dispo (sans téléphone) | — |
| Déguisements | Texte d'inspi + galerie (images à venir) | Intro éditable via `deguisements_intro` dans `textes` |
| Photos | Redirect Google Drive | — |

---

## Structure Google Sheets — fichier "Astro Festival — Base de données"
ID : `1Op0O3sUWPec0cjNENKbRfO3RKvphkCJo79Vr_pxfjb8`

| Onglet | Colonnes clés | Notes |
|---|---|---|
| `inventaire` | nom, categorie, quantite, proprietaire, lieu, utilisation, image_url, recupere | — |
| `lineup` | nom, jour, heure_debut, heure_fin, scene, materiel, style, image_url, type | type : DJ/Animation/Projection/Repas/Info |
| `horaires_site` | jour, ouverture, fermeture | — |
| `repas` | jour, moment, plat, allergenes, prepare_quand, shift_responsable, notes | — |
| `shifts_cuisine` | nom, slot, repas_concerne | — |
| `shifts_bar` | nom, nuit, tranche | — |
| `covoit_voitures` | conducteur, telephone, nb_places, lieu_depart, heure_depart, heure_arrivee_festival | — |
| `covoit_passagers` | conducteur, nom_passager, trajet | trajet : Aller/Retour/Aller-Retour |
| `covoit_train` | nom, heure_depart_train, jour_aller, heure_retour_train, jour_retour, conducteur_pickup | — |
| `plan_dodo` | gite, etage, chambre, config_lit, occupant | Gîte 1 et Gîte 2 |
| `todo` | tache, categorie, fait | colonnes dans cet ordre exact |
| `montage_tasks` | team, categorie, ordre, tache, description, duree_estimee, schema_url | teams : Hangar/Préau/Gîte-Stockage-Courses ; `description` = développement de la tâche (dépliable au clic) ; `schema_url` = schéma spécifique à la tâche |
| `textes` | cle, valeur | contenu éditorial de la webapp (voir ci-dessous) |

### Clés `textes` disponibles
| Clé | Où affiché |
|---|---|
| `infos_adresse` | Infos > Comment venir |
| `infos_horaires` | Infos > Comment venir |
| `infos_voiture` | Infos > Comment venir |
| `infos_train` | Infos > Comment venir |
| `infos_items_interieur` | Infos > Quoi apporter (une ligne = un item) |
| `infos_items_tente` | Infos > Quoi apporter |
| `infos_items_commun` | Infos > Quoi apporter |
| `infos_repas` | Infos > Repas & boissons |
| `infos_bar` | Infos > Repas & boissons |
| `infos_a_savoir` | Infos > À savoir (une ligne = un paragraphe) |
| `deguisements_intro` | Page Déguisements |
| `plan_dodo_schema_gite1` | Plan dodo > onglet Gîte 1 |
| `plan_dodo_schema_gite2_rdc` | Plan dodo > onglet Gîte 2 RDC |
| `plan_dodo_schema_gite2_1er` | Plan dodo > onglet Gîte 2 1er étage |

---

## Architecture technique

### Lecture
`Api.get(tab)` → `GET ?tab=<nom>` → retourne tableau d'objets JSON
Cache 5 min en mémoire (vidé au reload de page).

### Écriture
`Api.write(params)` → `GET ?action=<action>&...params`
Deux actions disponibles :
- `update_cell` : `{ action, tab, row, col, value }` — met à jour une cellule par numéro de ligne (`_row`)
- `append_todo` : `{ action, tache, categorie }` — ajoute une ligne dans l'onglet `todo`

Le champ `_row` est injecté par `sheetToJson` côté Apps Script (= numéro de ligne réel dans le sheet).

### Inline editing (Équipes)
Clic sur un `.editable-name` → input → blur/Enter → `Api.write(update_cell)`.
Les spans portent les attributs `data-tab`, `data-row`, `data-col`.

---

## Fichiers de l'app
```
Astrolab/
├── index.html          — shell HTML (login + app + modal DJ)
├── style.css           — design system complet
├── js/
│   ├── config.js       — CONFIG.API_URL + CONFIG.PASSWORDS + CACHE_TTL
│   ├── api.js          — Api.get() + Api.write() avec cache
│   ├── admin.js        — ADMIN_NAV + AdminTpl (templates admin)
│   └── app.js          — App (logique) + Tpl (templates festivalier) + icons
└── api/
    └── Code.gs         — Apps Script (doGet, handleWrite, sheetToJson)
```

---

## Ce qui reste à faire
- [ ] **Déployer sur GitHub Pages** — pas encore fait
- [ ] **Remplir les onglets Sheets** : shifts cuisine, shifts bar, plan dodo, covoit, todo, montage_tasks (+ colonne `description`)
- [ ] **Remplir l'onglet `textes`** : adresse, horaires, infos pratiques, intro déguisements, et les 3 nouvelles clés dodo (`plan_dodo_schema_gite1`, `plan_dodo_schema_gite2_rdc`, `plan_dodo_schema_gite2_1er`)
- [ ] **Ajouter les assets** : schémas gîtes (3 images), images inventaire, galerie déguisements
- [ ] **Covoit form festivalier** : formulaire pour s'inscrire conducteur/passager (prévu, pas encore fait)

## Rendu texte (fmt)
Les valeurs de la colonne `valeur` dans l'onglet `textes`, et le champ `description` dans `montage_tasks`, supportent :
- Retours à la ligne (Alt+Enter dans Sheets) → affichés correctement
- `**texte**` → **texte** en gras
