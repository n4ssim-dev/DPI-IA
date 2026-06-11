# TODO — Jalons détaillés (NovaSanté Lab DPI-IA)

Suivi détaillé des jalons proposés dans [SPEC.md, section 12](SPEC.md#12-jalons-proposés).
Chaque jalon s'appuie sur le précédent.

1. **Socle Docker** : `docker-compose.yml` (frontend, backend, db) qui démarre
2. **Socle DPI** : fiche patient, consultations, constantes (CRUD complet, React + FastAPI)
3. **Brique IA n°1** : alerte sur constantes anormales (TensorFlow.js, frontend)
4. **Brique IA n°2** : OCR de documents médicaux (Tesseract.js, frontend)
5. **Brique IA n°3** : dictée vocale (Web Speech API, frontend)
6. **Brique IA n°4** : détection de tendance sur les constantes (numpy/scikit-learn, backend)
7. **Démo & retours utilisateurs**

## Jalon 1 — Socle Docker

**Objectif** : disposer d'un environnement de développement qui démarre en
une seule commande (`docker compose up`), conforme à l'arborescence
décrite dans [SPEC.md, section 9](SPEC.md#9-organisation-docker).

- [x] Créer l'arborescence `frontend/`, `backend/`, `db/`
- [x] `backend/Dockerfile` (Python 3.11+, FastAPI, Uvicorn) avec endpoint
      `GET /health`
- [x] `frontend/Dockerfile` (Node, Vite — mode dev avec hot reload)
- [x] Service `db` : image PostgreSQL officielle + `db/init.sql` (schéma
      minimal, peut être vide à ce stade)
- [x] `docker-compose.yml` : 3 services, réseau commun, volume de
      persistance Postgres, volume de stockage des documents médicaux
- [x] Gestion de la configuration via `.env` / `.env.example` (identifiants
      DB, secret JWT)
- [x] Page d'accueil frontend minimale appelant `/health` pour valider la
      communication frontend ↔ backend ↔ db

**Critères d'acceptation**
- [x] `docker compose up` démarre les 3 services sans erreur sur un poste vierge
- [x] Le frontend affiche un statut "API OK" / "DB OK"
- [x] README mis à jour avec les instructions de lancement et les ports exposés

**Dépendances** : aucune (point de départ du projet)

## Jalon 2 — Socle DPI (CRUD complet)

**Objectif** : implémenter le cœur fonctionnel du DPI décrit dans
[SPEC.md, section 5.1](SPEC.md#51-module-dpi-cœur), le modèle de données
([SPEC.md, section 7](SPEC.md#7-modèle-de-données-esquisse)) et les
endpoints associés ([SPEC.md, section 8](SPEC.md#8-aperçu-de-lapi-fastapi)).

- [x] Modèles SQLAlchemy + migrations Alembic : `Utilisateur`, `Patient`,
      `Antecedent`, `TraitementEnCours`, `Consultation`, `Constante`,
      `Document`, `SuggestionIA`, `JournalAcces`
- [x] Script de seed Python idempotent (`app/seed.py`, exécuté au démarrage
      du backend) : jeu de données fictif (patients, consultations,
      constantes, utilisateurs). Remplace l'approche `db/init.sql` /
      `db/seed.sql` initialement envisagée — voir
      [SPEC.md, section 9](SPEC.md#9-organisation-docker)
- [x] Authentification JWT : `POST /auth/login`, hash des mots de passe
      (bcrypt), gestion des rôles (médecin / coordinateur / admin)
- [x] Endpoints patients : `GET /patients` (liste + recherche par nom,
      prénom, n° dossier), `POST /patients`, `GET /patients/{id}`
- [x] Endpoint `POST /patients/{id}/consultations`
- [x] Endpoint `POST /patients/{id}/constantes`
- [x] Endpoint `POST /patients/{id}/documents` (upload, stockage sur le
      volume Docker)
- [x] Log d'accès minimal (utilisateur, dossier consulté, horodatage)
- [x] Frontend : écran de connexion, liste/recherche patients, fiche
      patient (identité, antécédents, traitements, consultations,
      constantes, documents), formulaires d'ajout consultation/constantes,
      upload de documents

**Critères d'acceptation**
- [x] Un soignant peut se connecter, rechercher un patient, consulter son
  dossier complet, ajouter une consultation, des constantes et un document
- [x] Les données du seed sont visibles dès le premier démarrage
- [x] Les rôles définis (médecin, coordinateur, admin) sont distingués au
  moins pour la gestion des comptes (admin)

**Dépendances** : Jalon 1

## Jalon 3 — Brique IA n°1 : alerte sur constantes anormales (TensorFlow.js)

**Objectif** : détecter une constante hors plage et afficher une alerte
côté client, conformément à
[SPEC.md, section 5.2](SPEC.md#52-modules-ia-rudimentaires) et
[SPEC.md, section 13](SPEC.md#13-décisions-de-conception).

- [ ] Script Python générant un dataset synthétique à partir des seuils
      médicaux de référence (tension, fréquence cardiaque, glycémie,
      température...)
- [ ] Entraînement d'un petit modèle de classification et export au format
      TensorFlow.js (< 50 Mo)
- [ ] Intégration de `@tensorflow/tfjs` via CDN dans le frontend
- [ ] Chargement du modèle et inférence côté client lors de la saisie /
      affichage des constantes
- [ ] Affichage de l'alerte avec le disclaimer obligatoire ("Suggestion
      générée automatiquement, à valider par un professionnel de santé")
- [ ] Repli sur des règles à seuils simples si le modèle ne se charge pas

**Critères d'acceptation**
- La saisie d'une constante hors plage déclenche une alerte visuelle avec
  disclaimer, sans appel au backend
- Le modèle se charge en quelques secondes sur un poste standard

**Dépendances** : Jalon 2 (formulaire de saisie des constantes disponible)

## Jalon 4 — Brique IA n°2 : OCR de documents médicaux (Tesseract.js)

**Objectif** : extraire le texte d'un document scanné pour pré-remplir des
champs, conformément à
[SPEC.md, section 5.2](SPEC.md#52-modules-ia-rudimentaires).

- [ ] Intégration de Tesseract.js via CDN
- [ ] Lancement de l'OCR côté client après upload d'un document
      (image / PDF)
- [ ] Affichage du texte extrait et proposition de pré-remplissage de
      champs (ex. motif, observations)
- [ ] Sauvegarde du texte extrait (`texte_extrait`) via l'API, associé au
      document
- [ ] Disclaimer sur la fiabilité de l'extraction

**Critères d'acceptation**
- L'upload d'un document de test produit un texte extrait affiché à
  l'utilisateur et persisté en base

**Dépendances** : Jalon 2 (upload de documents disponible)

## Jalon 5 — Brique IA n°3 : dictée vocale (Web Speech API)

**Objectif** : permettre au soignant de dicter ses observations de
consultation, conformément à
[SPEC.md, section 5.2](SPEC.md#52-modules-ia-rudimentaires).

- [ ] Intégration de la Web Speech API (`SpeechRecognition`) dans le
      formulaire de consultation
- [ ] Bouton de dictée avec retour visuel (enregistrement en cours)
- [ ] Insertion du texte transcrit dans le champ observations, modifiable
      avant sauvegarde
- [ ] Message de repli si le navigateur ne supporte pas l'API

**Critères d'acceptation**
- Le soignant peut dicter du texte qui apparaît dans le champ observations
  et reste éditable
- Un message clair s'affiche en cas de navigateur incompatible

**Dépendances** : Jalon 2 (formulaire de consultation disponible)

## Jalon 6 — Brique IA n°4 : détection de tendance sur les constantes (backend)

**Objectif** : visualiser et alerter sur une dérive d'une constante au fil
des consultations, conformément à
[SPEC.md, section 5.2](SPEC.md#52-modules-ia-rudimentaires) et à
l'endpoint `GET /patients/{id}/constantes/tendance`
([SPEC.md, section 8](SPEC.md#8-aperçu-de-lapi-fastapi)).

- [ ] Endpoint `GET /patients/{id}/constantes/tendance` (FastAPI)
- [ ] Calcul d'une régression linéaire simple (numpy / scikit-learn) sur
      l'historique d'une constante donnée
- [ ] Retour de la pente, de la tendance (hausse / baisse / stable), d'un
      indice de confiance et d'un message de suggestion
- [ ] Frontend : graphique d'évolution de la constante + affichage de la
      tendance avec disclaimer
- [ ] Persistance optionnelle de la suggestion dans `suggestions_ia`

**Critères d'acceptation**
- Pour un patient avec au moins 3 mesures d'une même constante, l'endpoint
  retourne une tendance cohérente
- L'UI affiche un graphique et un message de tendance avec disclaimer

**Dépendances** : Jalon 2 (historique des constantes disponible)

## Jalon 7 — Démo & retours utilisateurs

**Objectif** : préparer une démonstration reproductible et recueillir les
retours des utilisateurs cibles
([SPEC.md, section 3](SPEC.md#3-utilisateurs-cibles)).

- [ ] Enrichissement du `db/seed.sql` pour couvrir tous les cas d'usage IA
      (constantes anormales, documents OCRisables, historique permettant
      une tendance)
- [ ] Rédaction d'un scénario de démo (parcours type par rôle)
- [ ] Vérification end-to-end de `docker compose up` sur un poste propre
- [ ] Documentation utilisateur (README, captures d'écran)
- [ ] Session de démonstration et collecte des retours (médecin,
      coordinateur, admin)
- [ ] Compte-rendu des retours et backlog pour les
      [extensions futures (V2), SPEC.md section 14](SPEC.md#14-extensions-futures-v2)

**Critères d'acceptation**
- La démo est reproductible en une commande sur une machine vierge
- Les retours utilisateurs sont documentés et priorisés

**Dépendances** : Jalons 1 à 6
