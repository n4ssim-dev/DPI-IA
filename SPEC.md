# SPEC — Dossier Patient Informatisé (DPI) Intelligent — Projet NovaSanté Lab

## 1. Contexte

**NovaSanté Lab** est un centre (fictif) dédié à l'évaluation, sur le
terrain et avec les soignants, de l'apport concret des outils numériques
de santé : diagnostic, prescription, suivi, surveillance, coordination
des soins.

Ce projet vise à **co-construire un prototype de DPI (Dossier Patient
Informatisé) "intelligent"**, c'est-à-dire un DPI classique enrichi de
quelques briques d'IA *rudimentaires* mais fonctionnelles, démontrables,
et peu coûteuses (pas d'infra ML lourde, pas de GPU dédié, pas de service
payant).

L'objectif pédagogique/produit est de montrer une **valeur ajoutée
mesurable** apportée par l'IA sur des tâches concrètes du quotidien
soignant, tout en restant un prototype facilement déployable.

## 2. Objectifs du projet

- Fournir un DPI minimal mais cohérent : identité patient, antécédents,
  consultations, constantes, traitements, documents.
- Intégrer des fonctionnalités IA "rudimentaires" (complexité **Faible**
  uniquement pour le MVP) apportant un gain de temps ou d'aide à la
  décision pour le soignant.
- Rester sur une stack **gratuite, légère et conteneurisée**, exécutable
  en local en une commande (`docker compose up`).
- Documenter clairement les limites (prototype, pas de dispositif médical,
  pas de décision clinique automatisée).

## 3. Utilisateurs cibles

| Rôle | Besoins principaux |
|------|--------------------|
| Médecin / soignant | Consulter le dossier, saisir une consultation, voir des alertes/suggestions IA |
| Coordinateur de soins | Vue d'ensemble des patients suivis, suivi des constantes |
| Administrateur (NovaSanté Lab) | Gestion des comptes utilisateurs, accès aux dossiers |

> Hors périmètre : accès patient direct (portail patient) — pourra être
> envisagé dans une itération future.

**Modèle d'accès** : un seul établissement (NovaSanté Lab). Tous les
soignants authentifiés voient et peuvent modifier l'ensemble des dossiers
patients (pas de cloisonnement par soignant pour le MVP).

## 4. Architecture générale

```
┌────────────────────┐        REST/JSON        ┌──────────────────────┐
│   Frontend React    │ <─────────────────────> │   Backend FastAPI     │
│  (Vite + TS, SPA)   │                          │  (API + logique IA)   │
│                      │                          │                       │
│  - UI DPI            │                          │  - CRUD patients/     │
│  - Modèles IA légers  │                          │    consultations      │
│    embarqués          │                          │  - Auth (JWT)         │
│    (TensorFlow.js,    │                          │  - Détection de       │
│     Tesseract.js,     │                          │    tendance           │
│     Web Speech API)   │                          │    (numpy/sklearn)    │
└────────────────────┘                          └───────────┬──────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │   PostgreSQL (DB)     │
                                                   └──────────────────────┘
```

Tout le système est orchestré via **Docker Compose** : 3 services
(`frontend`, `backend`, `db`).

## 5. Périmètre fonctionnel — MVP

### 5.1 Module DPI (cœur)

- [ ] Authentification soignant (JWT, rôles : médecin / coordinateur / admin)
- [ ] Fiche patient : identité, contact, médecin référent
- [ ] Antécédents médicaux (allergies, pathologies chroniques, traitements en cours)
- [ ] Historique des consultations (date, motif, observations, conclusion)
- [ ] Constantes / paramètres vitaux (poids, taille, tension, température,
      fréquence cardiaque, glycémie...) avec historique horodaté
- [ ] Documents médicaux (upload PDF / image : ordonnances, comptes rendus, analyses)
- [ ] Recherche patient (nom, date de naissance, n° dossier)

### 5.2 Modules IA "rudimentaires"

Sélection retenue pour le MVP : uniquement des briques de complexité
**Faible**, réparties entre **côté client** (navigateur, via CDN, sans
appel serveur) et **côté serveur** (FastAPI, calcul léger Python).

| Brique IA | Objectif | Outil suggéré (gratuit) | Emplacement | Complexité |
|-----------|----------|--------------------------|-------------|------------|
| **Alerte sur constantes anormales** | Détecter une constante hors plage (tension, FC, glycémie...) et afficher une alerte | Seuils médicaux de référence (ex. tension > 140/90, FC > 100...) + petit modèle de classification **TensorFlow.js** (`@tensorflow/tfjs` via CDN), entraîné sur un dataset synthétique généré par script à partir de ces seuils | Frontend (React) | Faible |
| **OCR de documents médicaux** | Extraire le texte d'une ordonnance/analyse scannée pour pré-remplir des champs | **Tesseract.js** (CDN) | Frontend (React) | Faible |
| **Dictée vocale pour la saisie** | Permettre au soignant de dicter ses observations | **Web Speech API** (native navigateur, gratuite) | Frontend (React) | Faible |
| **Détection de tendance sur les constantes** | Visualiser/alerter sur une dérive (ex. tension qui augmente sur 3 consultations) | Régression linéaire simple (`numpy`/`scikit-learn`) exposée via un endpoint FastAPI | Backend (FastAPI) | Faible |

> ⚠️ Toute sortie IA doit être présentée comme une **suggestion**, jamais
> comme un diagnostic. Afficher systématiquement un disclaimer
> ("Suggestion générée automatiquement, à valider par un professionnel
> de santé").

> 💡 Briques de complexité **Moyenne** (résumé automatique via
> Transformers.js, classification du motif via scikit-learn) écartées du
> MVP — voir [section 14](#14-extensions-futures-v2).

## 6. Stack technique

| Composant | Choix | Notes |
|-----------|-------|-------|
| Frontend | **React** (Vite + TypeScript) | SPA, appels API via `fetch`/`axios` |
| Composants IA client | `tensorflow.js`, `tesseract.js`, Web Speech API (CDN/native) | Pas de build lourd, chargement dynamique |
| Backend | **FastAPI** (Python 3.11+) | API REST, validation via Pydantic |
| ML léger backend | `numpy`, `scikit-learn` | Calcul de tendance (régression linéaire) sur les constantes |
| Base de données | **PostgreSQL** | via `SQLAlchemy` + `Alembic` pour les migrations |
| Authentification | JWT (`fastapi-users` ou implémentation maison) | Rôles : médecin, coordinateur, admin |
| Conteneurisation | **Docker** + **Docker Compose** | 3 services : frontend, backend, db |
| Stockage documents | Volume Docker monté (filesystem) | Suffisant pour le prototype |

## 7. Modèle de données (esquisse)

```
Patient
 ├─ id, nom, prénom, date_naissance, sexe, contact
 ├─ antecedents (1-N)
 ├─ traitements_en_cours (1-N)
 ├─ consultations (1-N)
 │    ├─ date, motif, observations, conclusion, soignant_id
 │    ├─ constantes (1-N) : type, valeur, unité, date_mesure
 │    └─ suggestions_ia (1-N) : type, contenu, confiance, date
 └─ documents (1-N) : type, fichier, date_upload, texte_extrait (OCR)

Utilisateur (soignant)
 ├─ id, nom, role, email, mot_de_passe_hash
```

## 8. Aperçu de l'API (FastAPI)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/auth/login` | Authentification, retourne un JWT |
| `GET` | `/patients` | Liste / recherche de patients |
| `POST` | `/patients` | Création d'un patient |
| `GET` | `/patients/{id}` | Détail d'un patient (dossier complet) |
| `POST` | `/patients/{id}/consultations` | Ajout d'une consultation |
| `POST` | `/patients/{id}/constantes` | Ajout de constantes vitales |
| `GET` | `/patients/{id}/constantes/tendance` | Analyse de tendance (IA backend) |
| `POST` | `/patients/{id}/documents` | Upload d'un document médical |

## 9. Organisation Docker

```
dpi-ia/
├── docker-compose.yml
├── frontend/        # React (Vite + TS)
│   └── Dockerfile
├── backend/         # FastAPI
│   ├── Dockerfile
│   └── app/
└── db/
    ├── init.sql     # création du schéma
    └── seed.sql     # patients/consultations/constantes fictifs (chargé au démarrage)
```

## 10. Exigences non fonctionnelles

- **Confidentialité / RGPD** : données de santé = données sensibles.
  Même en prototype, prévoir anonymisation des jeux de données de
  démonstration, pas de données patients réelles.
- **Sécurité** : authentification JWT obligatoire, mots de passe hashés
  (bcrypt), accès aux dossiers tracé (log d'accès minimal).
- **Performance IA côté client** : modèles légers (< 50 Mo si possible)
  pour rester utilisables sur un poste standard.
- **Reproductibilité** : `docker compose up` doit suffire à lancer
  l'ensemble (frontend + backend + db + seed de données).
- **Accessibilité** : interface utilisable par des soignants non
  techniques (UI simple, claire, peu de clics).

## 11. Hors périmètre (V1)

- Interopérabilité avec des DPI existants / normes HL7-FHIR (à envisager
  en V2)
- Portail patient
- Prescription électronique réglementaire
- Modèles IA entraînés sur données réelles / certifiés dispositif médical
- Téléconsultation / messagerie sécurisée
- Déploiement cloud / mise en production

## 12. Jalons proposés

Vue d'ensemble séquentielle (chaque jalon s'appuie sur le précédent). Le
détail de chaque jalon (tâches, critères d'acceptation, dépendances) est
suivi dans [TODO.md](TODO.md).

1. **Socle Docker** : `docker-compose.yml` (frontend, backend, db) qui démarre
2. **Socle DPI** : fiche patient, consultations, constantes (CRUD complet, React + FastAPI)
3. **Brique IA n°1** : alerte sur constantes anormales (TensorFlow.js, frontend)
4. **Brique IA n°2** : OCR de documents médicaux (Tesseract.js, frontend)
5. **Brique IA n°3** : dictée vocale (Web Speech API, frontend)
6. **Brique IA n°4** : détection de tendance sur les constantes (numpy/scikit-learn, backend)
7. **Démo & retours utilisateurs**

## 13. Décisions de conception

- **Données pour l'alerte sur constantes anormales** : pas de dataset
  externe — on part des seuils médicaux de référence connus (tension,
  FC, glycémie, température...) et on génère un dataset synthétique par
  script pour entraîner le petit modèle TensorFlow.js.
- **Données de démo** : seed automatique au premier démarrage de
  `docker compose` (`db/seed.sql`) — quelques patients fictifs,
  consultations et constantes pré-remplis pour pouvoir démontrer l'app
  immédiatement.
- **Accès multi-soignants** : mono-établissement, dossiers patients
  partagés entre tous les soignants authentifiés (pas de cloisonnement
  par soignant référent pour le MVP).

## 14. Extensions futures (V2)

Briques IA de complexité **Moyenne**, écartées du MVP mais envisageables
en itération suivante si le temps le permet :

| Brique IA | Objectif | Outil suggéré (gratuit) | Emplacement |
|-----------|----------|--------------------------|-------------|
| **Résumé automatique de consultation** | Générer un résumé court à partir du texte libre saisi par le soignant | **Transformers.js** (Hugging Face, modèle type `distilbart-cnn`, via CDN/WASM) | Frontend (React) |
| **Classification du motif de consultation** | Suggérer une catégorie (cardio, respiratoire, ORL...) à partir du texte du motif | **scikit-learn** (`TfidfVectorizer` + `LogisticRegression`, entraîné sur un petit corpus synthétique) | Backend (FastAPI) |
