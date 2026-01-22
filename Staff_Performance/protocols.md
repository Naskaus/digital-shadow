3) GUIDE DE DEV + PROMPTS ANTIGRAVITY
3.1 Choix techno (décidé pour “pro + smooth + Pi friendly”)

Backend : Python FastAPI

DB : PostgreSQL

ORM/migrations : SQLAlchemy 2.0 + Alembic

Auth : JWT cookies HttpOnly + refresh rotation (simple SaaS)

Frontend : React (Vite) + TypeScript

Table : TanStack Table + TanStack Query + virtualization (react-virtual)

UI : Tailwind (rapide, propre)

Packaging : monorepo /backend /frontend

Deployment : systemd service unique sur port 8001

FastAPI sert l’API sous /api

FastAPI sert le build frontend (static) sur /

Pourquoi ça : 1 service, 1 port, 1 domaine → stable sous Cloudflared.

3.2 Convention repo (fragmenté, pas de fichiers énormes)
digital-shadow/
  CONTEXT.md           (READ ONLY)
  AI_Memory.md         (append only by LLM)
  backend/
    app/
      main.py
      core/
        config.py
        logging.py
        security.py
      db/
        session.py
        models/
          import_run.py
          raw_row.py
          fact_row.py
          agent_rule.py
          user.py
        migrations/     (alembic)
      services/
        import_service.py
        sheets_client.py
        validation.py
        agent_mapping.py
        audit.py
      api/
        deps.py
        routers/
          auth.py
          import_runs.py
          rows.py
          analytics.py
          settings.py
    requirements.txt
  frontend/
    src/
      app/
      pages/
        Login.tsx
        Landing.tsx
        staff/
          ImportQA.tsx
          DataTable.tsx
          Analytics.tsx
          Settings.tsx
      components/
        Table/
        Filters/
        KPIBar/
      api/
        client.ts
        hooks.ts
      styles/
    vite.config.ts
    package.json
  deploy/
    digital-shadow.service
    install.sh
    env.example


Règle : si un fichier dépasse ~250–300 lignes → refactor.

3.3 Endpoints API (résumé)

POST /api/auth/login

POST /api/auth/refresh

POST /api/auth/logout

GET /api/me

Import

POST /api/import/run (sources, mode, window_days)

GET /api/import/runs

GET /api/import/runs/{id}

GET /api/import/runs/{id}/errors

Rows (table)

GET /api/rows (filters, sort, cursor, limit)

GET /api/rows/kpis (same filters)

Analytics

GET /api/analytics/agents

GET /api/analytics/staff

GET /api/analytics/agent/{agent_key}

GET /api/analytics/staff/{staff_id}

Settings (admin)

GET/POST /api/settings/sources

GET/POST /api/settings/agent-rules

GET/POST /api/settings/users

3.4 Import “window incremental” (recommandation)

FULL : relit tout, upsert

INCREMENTAL : relit fenêtre glissante (ex 90 jours) sur 2026 (et option sur 2025 si corrections)

Pourquoi : même si “normalement” append-only, la réalité humaine adore éditer le passé.

3.5 Déploiement sur Pi 5 (propre)
Ports / cloudflared

Garder staff.naskaus.com → localhost:8001 (comme aujourd’hui)

Remplacer le service actuel.

systemd (nouveau)

Service : uvicorn/gunicorn ASGI

Exemple : ExecStart=/var/www/digital-shadow/venv/bin/gunicorn -k uvicorn.workers.UvicornWorker -w 3 -b 0.0.0.0:8001 app.main:app

DB Postgres

Option A (recommandée) : Docker postgres dédié digitalshadow-postgres + volume

Port exposé uniquement localhost.

Backups cron.

3.6 Protocole Antigravity (important)

Lire CONTEXT.md en entier avant toute action.

Ne jamais modifier CONTEXT.md.

À chaque fin de session (quand Sebastien dit “fin de session”) :

append un bloc dans AI_Memory.md :

ce qui a été fait

fichiers touchés

décisions prises

TODO next session

Pas de scripts temporaires non supprimés.

Pas de dead code, pas de fichiers géants.