# Frontend — DPI-IA NovaSanté Lab

Application React + Vite + TypeScript. En développement, elle tourne dans le
conteneur Docker avec hot-reload. Voir le [README racine](../README.md) pour
le démarrage du projet.

## Stack

| Outil | Rôle |
|-------|------|
| React 19 + TypeScript | SPA |
| Vite | Build et dev-server |
| React Router | Navigation |
| Axios | Appels API |

## Librairies chargées via CDN (index.html)

Ces dépendances ne sont **pas** dans `package.json` — elles sont chargées à
l'exécution depuis jsDelivr, sans impact sur le bundle Vite.

| Librairie | Version | Usage |
|-----------|---------|-------|
| TensorFlow.js | 4.22 | Alerte constantes anormales (modèle embarqué) |
| Tesseract.js | 5 | OCR de documents médicaux |
| Chart.js | 4 | Graphique d'analyse de tendance |
| vis-timeline | 8 | Vue d'ensemble : Timeline + Graph2d (dossier patient) |

## Structure `src/`

```
api/          appels HTTP (patients, auth)
components/   composants réutilisables
  ObservationSection.tsx  — Timeline + Graph2d via window.vis
context/      AuthContext (JWT)
ia/           briques IA client
  constantesIA.ts  — inférence TF.js + règles de seuil
  ocr.ts           — Tesseract.js
  useDictee.ts     — Web Speech API
pages/
  LoginPage.tsx
  PatientsListPage.tsx
  PatientDetailPage.tsx
types.ts      types TypeScript partagés
```

## Modèle TensorFlow.js

Le modèle de détection des constantes anormales est pré-entraîné et servi
statiquement depuis `public/models/constantes-model/`. Pour le ré-entraîner :

```bash
cd ../ml && npm install && npm run train:constantes
```

## Développement local (hors Docker)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production dans dist/
npx tsc --noEmit # vérification TypeScript seule
```
