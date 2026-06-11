# DPI-IA — NovaSanté Lab

Prototype de Dossier Patient Informatisé (DPI) "intelligent". Voir
[SPEC.md](SPEC.md) pour le contexte et les spécifications, et
[TODO.md](TODO.md) pour le suivi des jalons.

## Lancer le projet

Prérequis : Docker et Docker Compose.

```bash
cp .env.example .env
docker compose up
```

Services exposés :

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:8000        |
| Backend health check | http://localhost:8000/health |
| PostgreSQL | localhost:5433 |

La page d'accueil du frontend affiche le statut de l'API et de la base de
données (via `/health`).
