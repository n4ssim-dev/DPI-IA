# DPI-IA — NovaSanté Lab

Prototype de Dossier Patient Informatisé (DPI) enrichi de briques IA
légères, entièrement côté client. Voir [SPEC.md](SPEC.md) pour les
spécifications et [TODO.md](TODO.md) pour le suivi des jalons.

## Démarrage

Prérequis : **Docker** et **Docker Compose**.

```bash
cp .env.example .env
docker compose up
```

| Service    | URL                              |
|------------|----------------------------------|
| Frontend   | http://localhost:5173            |
| Backend    | http://localhost:8000            |
| API docs   | http://localhost:8000/docs       |
| PostgreSQL | localhost:5433                   |

> **Navigateur recommandé** : Chrome ou Edge — requis pour la dictée vocale
> (Web Speech API) et optimal pour les fonctions IA.

## Comptes de démonstration

| Rôle         | Email                          | Mot de passe |
|--------------|--------------------------------|--------------|
| Médecin      | martin@novasante-lab.fr        | medecin123   |
| Coordinateur | coordination@novasante-lab.fr  | coord123     |
| Admin        | admin@novasante-lab.fr         | admin123     |

## Fonctionnalités IA

| Brique | Technologie | Où |
|--------|-------------|----|
| Alerte constante anormale | TensorFlow.js (modèle local) | Onglet Constantes — saisie et affichage |
| Détection de tendance | scikit-learn (régression linéaire, backend) + Chart.js | Onglet Constantes — section Tendance |
| OCR de documents | Tesseract.js (CDN, 100 % client) | Onglet Documents — upload |
| Dictée vocale | Web Speech API (natif navigateur) | Onglet Consultations — champ Observations |

Toutes les suggestions IA sont accompagnées d'un disclaimer
*"à valider par un professionnel de santé"*.

## Données de démonstration

La base est pré-remplie au démarrage par `backend/app/seed.py` avec
trois patients fictifs couvrant tous les cas d'usage IA :

- **Jean Dupont** — hypertension : 6 mesures de tension/saturation/FC sur
  5 mois (tendance hausse tension + baisse saturation), valeurs anormales,
  2 documents avec texte OCR pré-rempli.
- **Marie Lefevre** — diabète type 2 : 5 mesures glycémie + température sur
  4 mois (tendances hausses), valeurs anormales.
- **Lucas Bernard** — enfant : 4 mesures poids/taille/température (fièvre
  persistante), 1 document vaccination avec texte OCR pré-rempli.

Voir [DEMO.md](DEMO.md) pour le scénario de démonstration complet.

## Réinitialiser la base

```bash
docker compose down -v && docker compose up
```

## Structure du projet

```
backend/          FastAPI + SQLAlchemy + Alembic
  app/
    routers/      endpoints REST
    models.py     modèles SQLAlchemy
    seed.py       données de démonstration
frontend/         React + Vite + TypeScript
  src/
    ia/           briques IA (constantesIA.ts, ocr.ts, useDictee.ts)
    pages/        écrans (PatientDetailPage, LoginPage, …)
    api/          appels HTTP axios
  public/models/  modèle TensorFlow.js (constantes-model/)
ml/               script d'entraînement du modèle TF.js (Node)
```

## Développement

```bash
# Backend seul (hot-reload)
docker compose up backend db

# Ré-entraîner le modèle TensorFlow.js
cd ml && npm install && npm run train:constantes
```
