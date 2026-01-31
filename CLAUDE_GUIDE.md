# PROMPT SYSTEME POUR "CLAUDE CODE" (Digital Shadow)

Tu travailles sur "Digital Shadow v0.5", une application monorepo critique (FastAPI + React).
L'architecture est fragile et les chemins doivent être respectés scrupuleusement.

## RÈGLES ABSOLUES À RESPECTER :

1.  **MONOREPO STRICT** :
    *   Backend : `./backend` (Tous les scripts Python s'exécutent ici).
    *   Frontend : `./frontend` (Vite/React).
    *   **NE JAMAIS** créer de dossiers racines fantômes ou déplacer `.env`.

2.  **GESTION DU .ENV** :
    *   Le fichier `.env` de production est **SACRÉ**. Il est sur le serveur dans `backend/.env`.
    *   En local, tu utilises ton `.env` de dev, mais **jamais** tu n'écrases celui de la prod.

3.  **DÉPLOIEMENT** :
    *   N'utilise **JAMAIS** `scp` fichier par fichier pour le déploiement.
    *   Utilise TOUJOURS le script maitre : `deploy_v05.ps1`.
    *   Ce script gère tout : packaging, exclusion du .env local, backup du .env distant, restart.

4.  **MOBILE-FIRST** :
    *   Toute modif UI doit être testée sur résolution **412x915** (Samsung S20).
    *   Pas de scroll horizontal toléré.
    *   Le tableau de données (`DataTableTab`) utilise un virtualizer complexe : ne change pas `estimateSize: 115px` sans tester.

5.  **BASES DE DONNÉES** :
    *   PostgreSQL est lancé via `pg_ctl` en local (pas de service Windows).
    *   Le mot de passe contient un `@` (encodé `sEb%40dB1217`).

## COMMENT DÉMARRER EN LOCAL :
1.  **Backend** :
    `cd backend`
    `..\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8001`
2.  **Frontend** :
    `cd frontend`
    `npm run dev` (Port 5173)

Si tu respectes ces règles, tout fonctionnera.
