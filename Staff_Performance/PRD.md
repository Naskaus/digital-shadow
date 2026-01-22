1) PRD — DIGITAL-SHADOW v0.2 (Staff Performance)
1.1 Objectif produit

Créer une web app “Staff Performance” fiable à 100% (zéro invention, zéro approximation) avec :

Import Google Sheets (2 sources : 2025 + 2026, même structure A→Q)

Import idempotent, audit-proof, hash, logs, erreurs.

Import déclenché par bouton “RUN IMPORT”.

Validation & QA data

Rejets explicitement justifiés (pas de “guess”).

Mismatches (ex: agent calculé vs agent sheet) flag, jamais “corrigé”.

Vue “table géante” (style Google Sheets)

Navigation fluide sans pagination 500 pages.

Scroll infini + virtualisation + tri + filtres multi-choix.

Dashboard Analytics

Leaderboard Agents et Girls (staff).

Filtres multi-choix : Bar, Agent, Année, Mois, Contract.

KPIs cohérents : les SUM en haut matchent toujours les filtres.

Stats “rentabilité” complètes (best/low/avg, etc.).

Gouvernance docs

CONTEXT.md = source de vérité (PRD + flashout + guide). READ-ONLY.

AI_Memory.md = l’agent LLM doit append un résumé en fin de session (quand vous dites “fin de session”).

1.2 Portée
Inclus (v0.2)

Auth + login page.

Landing page (mini dashboard) avec 2 tuiles :

Financial Analyses (placeholder)

Staff Performance (v0.2 complet)

Staff Performance :

Import (2025 + 2026)

Data QA + erreurs

Table géante + filtres/tri

Analytics leaderboards + fiches staff/agent

Exclu (hors scope v0.2)

Accounting app (traité plus tard).

Écriture de data dans Sheets.

Recalcul des colonnes financières (TOTAL/PROFIT/etc.). Google Sheets reste la vérité.

1.3 Utilisateurs & rôles

Admin : accès complet (import, settings, mapping agents, users).

Viewer : lecture table + analytics.

1.4 Contraintes “qualité senior” (non négociables)

Zéro dead code : suppression immédiate des scripts temporaires.

Pas de fichiers monolithiques : fragmentation propre (backend routers/services, frontend modules).

Aucune génération de “test scripts” jetables qui restent dans le repo.

Architecture revue en continu : check structure dossiers, imports, duplication, cohérence.

Logs et erreurs explicitement tracés.

Reproductibilité : même import relancé → même résultat.

1.5 Données (source Google Sheets)
Sources

Sheet 2026 : (structure A→Q)

Sheet 2025 : (structure A→Q)
Import via Google Sheets API, lecture seule.

Structure A→Q (canon)

A BAR, B DATE, C AGENT, D STAFF, E POSITION, F SALARY, G START, H LATE, I DRINKS, J OFF, K CUT LATE, L CUT DRINK, M CUT OTHER, N TOTAL, O SALE, P PROFIT, Q CONTRACT.

Règle STAFF ID (absolue)

STAFF est un identifiant atomique : "NNN - NICKNAME"

On le stocke tel quel (trim normalisation uniquement).

On peut dériver staff_num_prefix (ex: 046) comme champ dérivé pour analytics, sans jamais remplacer staff_id.

Règle Agent “appartenance”

Une fille appartient à un agent de manière stable.

Détermination par range numérique sur le préfixe staff :

Agent 1 = 100–199, Agent 2 = 200–299, etc. (règle configurable)

Important : Les agents sont par bar.
AGENT #5 (MANDARIN) ≠ AGENT #5 (SHARK).

Colonne AGENT (sheet)

Conservée telle quelle (agent_label_raw).

On calcule aussi agent_id_derived via mapping range par bar.

Si mismatch : flag agent_mismatch = true + log (mais aucun “fix” automatique).

Formats pièges à gérer

Valeurs THB formatées (“THB 1,300.00”) → parsing robuste.

Time (START) et LATE : peuvent venir sous forme “time excel/gsheet” bizarre (ex. 12/31/1899) → parser en “time-only” si nécessaire, sinon log.

1.6 Modèle de données (PostgreSQL)
Tables

1) import_runs

id (uuid), started_at, finished_at, status (RUNNING/SUCCESS/FAILED)

sources (jsonb), options (jsonb)

stats (jsonb) : rows_read, rows_valid, rows_rejected, inserted, updated

checksum (text) : hash global du run

2) raw_rows (staging immuable)

id (uuid)

source_year (int: 2025/2026)

source_sheet_id (text), source_tab (text), source_row (int)

a_to_q_json (jsonb) : valeurs brutes A→Q

row_hash (text) : sha256(normalized A→Q)

fetched_at, import_run_id

3) fact_rows (table exploitable)

id (uuid)

business_key (text UNIQUE) = sha256(bar|date|staff_id)

bar (text)

date (date)

year (int generated)

month (int generated)

agent_label_raw (text)

staff_id (text) ✅ atomique “NNN - NAME”

staff_num_prefix (int derived, nullable si parsing impossible)

agent_id_derived (int nullable)

agent_key (text) = bar|agent_id_derived (pour “agent distinct par bar”)

position (text nullable)

salary_thb (numeric nullable)

start_time (time nullable)

late_minutes (int nullable)

drinks (int nullable)

off_thb (numeric nullable)

cut_late_thb, cut_drink_thb, cut_other_thb (numeric nullable)

total_thb, sale_thb, profit_thb (numeric nullable, profit peut être négatif)

contract (text nullable)

agent_mismatch (boolean)

row_hash (text)

raw_row_id (uuid FK)

updated_at

4) import_errors

id, import_run_id, source_year, sheet_row_ref

reason_code, reason_detail

a_to_q_json (jsonb)

5) app_users

id, email, password_hash, role, is_active, created_at

6) auth_sessions / refresh_tokens

selon implémentation (JWT cookies + refresh rotation)

7) agent_range_rules (configurable)

id, bar, agent_id, range_start, range_end, label, is_active

Note : agent_range_rules permet de changer la logique sans toucher au code.

1.7 Import : exigences fonctionnelles
UI Import

Bouton “RUN IMPORT”

Options :

Sources : 2025 / 2026 (multi-choix)

Mode : FULL (rebuild) / INCREMENTAL (window recent)

Fenêtre INCREMENTAL : ex. 90 jours (config)

Affiche :

Dernier run, statut, stats

Top erreurs (table)

Lien “voir détails run”

Règles d’idempotence

Une ligne unique = (bar, date, staff_id)

business_key dérivé uniquement de ces champs.

Upsert :

si business_key existe et row_hash identique → rien

si row_hash différent → update fact_rows + audit

Garanties anti-hallucination

Aucune transformation “métier” silencieuse.

Tout parsing = déterministe, loggable.

Rejets et mismatches visibles.

1.8 Table géante (UI) : exigences

Expérience “Google Sheet” :

scroll vertical infini

colonnes figées (au moins BAR/DATE/AGENT/STAFF)

tri par colonnes (alpha/num)

filtres multi-choix (bar, agent, year, month, contract)

recherche (staff_id contains)

Performance :

virtualisation (rendu) + “infinite query” (data)

tri/filtres côté serveur (SQL) pour cohérence

KPIs en haut :

rows count (staff-days)

SUM profit, SUM sale, SUM drinks, AVG profit/day, etc.

Toujours basés sur exactement les filtres actifs.

1.9 Analytics : exigences
Leaderboard Agents

Un agent = (bar + agent_id_derived) distinct

KPIs :

Volume : # girls (distinct staff_id), # staff-days

Performance : sum profit, avg profit per girl, profit per staff-day

Constance : days active (distinct dates), avg days/girl, “retention-ish” (option)

Classement multi-critères :

Score composite configurable : ex.
score = w1*norm(volume_girls) + w2*norm(sum_profit) + w3*norm(days_active)

Tri libre sur chaque métrique (asc/desc)

Leaderboard Girls (Staff)

KPIs :

profit_total, profit_avg, profit_best, profit_low

drinks_total, drinks_avg, drinks_best, drinks_low

days_worked, consistency (days/month etc.)

ROI proxy : profit_total / days_worked, profit_total / salary_total (si salary fiable)

Fiche detail :

courbe profit par jour (v1 simple : table + mini chart plus tard)

répartition par mois

anomalies : jours négatifs, jours manquants, agent mismatch flag

1.10 Sécurité & conformité

Auth obligatoire.

Cookies HttpOnly + CSRF strategy (si cookie sessions) ou JWT strict.

Rate limit sur /login.

Secrets via env (jamais commit).

Google creds : service account JSON sur serveur (chmod strict), sheet partagée avec le SA.

1.11 Déploiement (Raspberry Pi 5 + Cloudflared)
Cible

Remplacer l’existant “digital-shadow Flask” par :

FastAPI backend + SPA frontend servis sur un seul port (recommandé)

Port conseillé : garder 8001 pour compatibilité staff.naskaus.com

Process

/var/www/digital-shadow/ devient le nouveau monorepo

systemd digital-shadow.service pointe sur uvicorn/gunicorn ASGI

PostgreSQL :

idéal : container postgres dédié OU service local

vous avez déjà postgres pour n8n (internal docker). On évite de réutiliser “internal-only” pour prod app.

recommandation : postgres séparé (container + volume + port local non exposé public)

1.12 Critères d’acceptation (Definition of Done)

Import 2025+2026 fonctionne, relançable sans duplicats.

0 “inventions” : toute erreur apparaît dans import_errors.

Table géante navigable fluide (scroll, tri, filtres).

KPIs top bar toujours cohérents avec filtres.

Leaderboards agents/girls exacts, triables, filtrables.

Repo propre : pas de scripts temporaires, pas de dead code, fichiers fragmentés, README à jour.

CONTEXT.md jamais modifié par l’agent.

AI_Memory.md mis à jour à votre demande (“fin de session”).

2) FLASHOUT + USER WORKFLOW (click-by-click)
2.1 Global
Page 1 — Login

Champs : email / password

Bouton : Sign in

Erreurs : invalid creds / locked / rate limit

Success → redirect /app

Page 2 — Landing /app

Mini dashboard avec 2 cards :

Financial Analyses (disabled / “coming soon”)

Staff Performance (enabled)

Click “Staff Performance” → /staff

2.2 Staff Performance
Navigation interne (tabs)

Tab A: Import & QA

Tab B: Data Table

Tab C: Analytics

Tab D: Settings (admin only)

Tab A — Import & QA

Section “Run Import”

Multi-select Sources : [2025] [2026]

Select Mode :

FULL (rebuild)

INCREMENTAL (window)

If INCREMENTAL : window days (default 90)

Bouton RUN IMPORT

Après click RUN IMPORT

UI passe en “RUNNING”

Affiche logs live (polling)

À fin :

status SUCCESS/FAILED

stats : rows_read / valid / rejected / inserted / updated

Top reasons table (import_errors grouped)

Bouton “View Run Details”

View Run Details

Table erreurs (download CSV)

Table mismatches (agent mismatch)

Checksums du run

Tab B — Data Table (Google-like)

Top bar

Filtres multi-choix :

Bar (multi)

Year (multi)

Month (multi)

Agent (multi, dépend du bar)

Contract (multi)

Search box : staff_id contains

KPI strip

Rows (staff-days)

SUM Profit / SUM Sale / SUM Drinks

AVG Profit / day

(option) # girls distinct

Table

Colonnes A→Q + derived fields (optionnels masqués)

Tri :

click header = sort asc/desc

Scroll infini :

charge chunk suivant automatiquement

Column pinning :

BAR/DATE/AGENT/STAFF pinned left

Row click → ouvre drawer “Staff Day Detail”

affiche la ligne brute + parsing + flags

Tab C — Analytics

Section 1: Agent Leaderboard

mêmes filtres (bar/year/month/contract)

table agents :

agent_key (bar + agent_id)

girls_count, staff_days, profit_sum, profit_avg_per_girl, profit_per_day, days_active

score (composite)

tri par chaque colonne

click agent → page détail agent :

liste des filles (ranked)

trend mensuel (v1 simple table)

Section 2: Girls Leaderboard

table staff :

staff_id (atomique)

profit_sum, avg, best, low

drinks_sum, avg, best, low

days_worked

ROI proxy metrics

click girl → page détail girl :

table jour par jour

stats

anomalies

Tab D — Settings (Admin)

Google sources config (sheet_id, tab, range)

Agent range rules (par bar) :

add/edit ranges

validation no overlap

Users management (admin/viewer)