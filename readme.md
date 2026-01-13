

📁 DIGITAL SHADOW - FLASHOUT FINAL COMPLET
ARCHITECTURE MASTER & WORKFLOW DÉTAILLÉ (V4.0)
Date: 8 Décembre 2025
Tech Lead: Seb + IA Senior Dev (20 ans exp.)
Serveur: Raspberry Pi 5 @ 192.168.1.43
Statut: PRODUCTION BLUEPRINT - READY TO BUILD

🎯 LA VISION GLOBALE (BIG PICTURE)
Mission Stratégique
Créer un Hub Central de Data Intelligence Multi-Sources qui transforme 3 établissements (SHARK, MANDARIN, RED DRAGONS) en organisation data-driven. L'app ingère TOUTES les données visuelles (photos de cahiers, rapports, données RH), les structure via IA + validation humaine, puis expose des analytics cross-sources pour révéler des insights business cachés.
Les 3 Piliers

INJECT DATA : Transformer chaos visuel → Data structurée propre
VALIDATE DATA : Human-in-the-loop systématique (Zero trust IA)
ANALYSE DATA : Corrélations intelligentes (Sales vs Staffing, Trends, Anomalies)


🏗️ ARCHITECTURE TECHNIQUE COMPLÈTE
1. INFRASTRUCTURE (DÉPLOYÉE)

Serveur: Raspberry Pi 5 (16GB RAM)
Stockage: SSD NVMe 256GB (Boot + Data)
OS: Raspberry Pi OS 64-bit
Réseau: IP Locale 192.168.1.43
Accès: SSH depuis Windows + Web App (navigateur)
Conteneurisation: Docker Compose v29.1.2

2. STACK LOGICIELLE
Frontend (Interface Web)
Technologies: HTML5 + CSS3 (Matrix/Cyberpunk) + Vanilla JS
Template Engine: Jinja2 (servi par FastAPI)
Design: Ultra-minimaliste, Terminal-style
Responsive: Mobile-first (Upload photos depuis smartphone)
Backend (Cerveau Python)
Framework: FastAPI 0.100+
Modules:
  - auth.py         → Gestion login/sessions
  - routes.py       → Routing pages (login, dashboard, inject, analyse)
  - ai_engine.py    → Orchestration Gemini (Multi-prompts par bar/type)
  - db_manager.py   → ORM SQLAlchemy + Business logic
  - export.py       → Génération Excel/PDF
Base de Données (PostgreSQL 16)
Architecture: UNIFIÉE avec colonnes bar_id
Schéma:
  - users              (id, username, password_hash, role, created_at)
  - bars               (id, name, slug, color_theme)
  - accounting_entries (bar_id, date, account_type, item, description, 
                        cash_in, cash_out, total_cash, 
                        credit_in, total_credit, validated_by, created_at)
  - hr_data            (bar_id, date, nb_girls, shift_type, validated_by)
  - reports_data       (bar_id, date, report_type, image_path, 
                        extracted_data_json, validated_by)
  - analysis_cache     (query_hash, result_json, generated_at)
IA (Google Gemini)
Modèle: Gemini 2.5 Flash (Vitesse) / 1.5 Pro (Complexité)
Rôles:
  1. OCR manuscrit haute précision
  2. Extraction contextuelle par type (Accounting/HR/Reports)
  3. Validation mathématique (Totaux staff vs IA)
  4. Génération insights (module Analyse - Phase 2)
3. STRUCTURE DOSSIERS (FINALE)
/home/seb/digital-shadow/
├── backend_api/
│   ├── main.py                 # Point d'entrée FastAPI
│   ├── auth.py                 # Login + Session management
│   ├── routes.py               # Routing /login /dashboard /inject /analyse
│   ├── ai_engine.py            # Gemini orchestration (3 bars × 3 data types)
│   ├── db_manager.py           # SQLAlchemy models + CRUD
│   ├── export.py               # Excel/PDF generators
│   ├── config.py               # Env vars, secrets
│   └── requirements.txt        
├── frontend_web/
│   ├── static/
│   │   ├── css/
│   │   │   ├── matrix.css      # Login terminal style
│   │   │   └── dashboard.css   # Cyberpunk theme
│   │   ├── js/
│   │   │   ├── login.js        # Cursor clignotant + validation
│   │   │   ├── inject.js       # Upload + SAS validation
│   │   │   └── analyse.js      # Charts + Filters (Phase 2)
│   │   └── images/             # Logos, icons
│   └── templates/
│       ├── login.html          # Matrix terminal
│       ├── dashboard.html      # 2 boutons + user info
│       ├── inject.html         # Bar selector → Data type → Upload
│       ├── accounting_sas.html # L'index.html actuel amélioré
│       └── analyse.html        # Coming soon (Phase 2)
├── database/
│   └── init.sql                # Schema + seed data (2 users + 3 bars)
├── docker/
│   ├── Dockerfile              # Python 3.11 + dependencies
│   ├── docker-compose.yml      # FastAPI + PostgreSQL
│   └── .env                    # Secrets (GEMINI_API_KEY, DB_PASSWORD)
├── exports/                    # Excel/PDF générés
└── uploads/                    # Photos temporaires (pre-validation)

🔐 SYSTÈME D'AUTHENTIFICATION
Users & Permissions
python# Table: users
ADMIN = {
    "username": "Seb",
    "password": "sEb@1217",  # Hashé en bcrypt en DB
    "role": "admin",
    "permissions": ["inject_data", "validate_data", "analyse_data", "manage_users"]
}

USER = {
    "username": "Phiborg", 
    "password": "pHi@1217",  # Hashé en bcrypt
    "role": "analyst",
    "permissions": ["analyse_data"]  # READ-ONLY sur analytics
}
Logique de Permissions
python# Dans routes.py
@app.get("/dashboard")
async def dashboard(user: User = Depends(get_current_user)):
    return {
        "inject_button_enabled": "admin" in user.role,
        "analyse_button_enabled": True,  # Tous (mais contenu différent)
        "show_accounting": "admin" in user.role,
        "show_hr": False,  # Phase 2
        "show_reports": False  # Phase 2
    }
```

---

## 🎬 WORKFLOW UTILISATEUR COMPLET

### PHASE 1 : LOGIN (Matrix Style)
```
┌─────────────────────────────────────┐
│                                     │
│   ▂▃▄▅▆▇ DIGITAL SHADOW ▇▆▅▄▃▂    │
│                                     │
│   > username: █                     │
│                                     │
│   (cursor vert clignotant)         │
│                                     │
└─────────────────────────────────────┘

Comportement:
1. Page 100% noire, texte vert phosphorescent
2. Pas de champ visible, juste un cursor "█" clignotant
3. User tape "Seb" → ENTER
4. Apparition ligne: "> password: "
5. User tape password (masqué: ****) → ENTER
6. Si OK: Fade to black → Dashboard
7. Si ERREUR: "ACCESS DENIED" en rouge clignotant 3x → reset
```

**Fichiers:**
- `templates/login.html` : Structure + cursor HTML/CSS
- `static/js/login.js` : Logique clavier, validation AJAX
- `static/css/matrix.css` : Animations, glow effects
- `backend_api/auth.py` : Endpoint `/api/auth/login` (POST)

---

### PHASE 2 : DASHBOARD (Hub Central)
```
┌──────────────────────────────────────────────┐
│  DIGITAL SHADOW v4.0                    [Seb]│
│  ════════════════════════════════════════    │
│                                              │
│  ┌──────────────┐      ┌──────────────┐    │
│  │ INJECT DATA  │      │ANALYSE DATA  │    │
│  │              │      │              │    │
│  │   [ACTIVE]   │      │  [INACTIVE]  │    │
│  └──────────────┘      └──────────────┘    │
│                                              │
│  Last Activity: 07/12/2025 - 14:33         │
│  Pending Validations: 3                     │
└──────────────────────────────────────────────┘

Permissions:
- ADMIN (Seb): Les 2 boutons actifs
- ANALYST (Phiborg): Voit les 2, mais "INJECT" grisé + tooltip "Admin only"
```

**Fichiers:**
- `templates/dashboard.html`
- `static/css/dashboard.css`
- `routes.py` : `/dashboard` (GET) → Injecte permissions dans template

---

### PHASE 3 : INJECT DATA (Flux Principal)

#### Étape 3.1 : Sélection Bar + Type
```
┌─────────────────────────────────────────┐
│  INJECT DATA                       [Seb]│
│  ═══════════════════════════════════    │
│                                         │
│  1. SELECT BAR:                         │
│     ○ Shark         (Bleu néon)        │
│     ○ Mandarin      (Rouge)            │
│     ○ Red Dragons   (Or)               │
│                                         │
│  2. SELECT DATA TYPE:                   │
│     ○ Accounting    [ACTIVE]           │
│     ○ HR Data       [Coming Soon]      │
│     ○ Reports       [Coming Soon]      │
│                                         │
│  [CONTINUE →]                           │
└─────────────────────────────────────────┘
```

**Logique:**
- Sélection obligatoire avant d'activer "Continue"
- Pour le moment, seul "Accounting" est cliquable
- Stockage en session: `{bar_id: 1, data_type: 'accounting'}`

#### Étape 3.2 : Upload Photo
```
┌─────────────────────────────────────────┐
│  SHARK > ACCOUNTING                [Seb]│
│  ═══════════════════════════════════    │
│                                         │
│  📸 UPLOAD NOTEBOOK PAGE                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Drag & Drop or Click          │   │
│  │                                 │   │
│  │     📷 Select Image             │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Accepted: JPG, PNG (Max 10MB)         │
│                                         │
│  [← BACK]              [ANALYSE →]     │
└─────────────────────────────────────────┘
```

**Logique:**
- Upload direct ou drag & drop
- Validation côté client: Type MIME + Taille
- Envoi POST `/api/inject/upload` avec `{bar_id, data_type, image_file}`

#### Étape 3.3 : LE SAS DE VALIDATION (Accounting)

C'est **TON INDEX.HTML ACTUEL AMÉLIORÉ**:
```
┌────────────────────────────────────────────────────────────┐
│  SHARK > ACCOUNTING > 01/11/2025                      [Seb]│
│  ══════════════════════════════════════════════════════    │
│                                                            │
│  ┌─────────────────┐  ┌──────────────────────────────┐   │
│  │                 │  │ DATE | ACCOUNT | ITEM | DESC │   │
│  │  [Photo du      │  │──────────────────────────────│   │
│  │   cahier]       │  │ 01/11│ Incomes │      │      │   │
│  │                 │  │ 01/11│         │Clean │ 1844 │   │
│  │                 │  │ ...                           │   │
│  │                 │  │                               │   │
│  │  Zoom: [+][-]   │  │ TOTALS:                      │   │
│  └─────────────────┘  │ Cash:    71,588  ✓ (Match)   │   │
│                       │ Credit: 124,569  ✓ (Match)   │   │
│                       └──────────────────────────────┘   │
│                                                            │
│  Staff Totals (Livre):  Cash: 71,588 | Credit: 124,569   │
│  IA Calculation:         Cash: 71,588 | Credit: 124,569   │
│  Status: 🟢 ALL CLEAR                                     │
│                                                            │
│  [← REJECT]  [EDIT DATA]  [✓ VALIDATE & SAVE]            │
└────────────────────────────────────────────────────────────┘
Données Affichées (7 Colonnes comme Excel):

DATE : Extraite de la page (ex: 01/11/2025)
ACCOUNT : "Incomes" ou vide (pour expenses)
ITEM : Description (Cleaning, Whisky, etc.)
DESCRIPTION : Champ libre (éditable si besoin)
CASH IN : Revenus cash
CASH OUT : Dépenses cash
TOTAL CASH : Solde courant cumulé
CREDIT IN : Revenus carte
TOTAL CREDIT : Solde carte cumulé

Règles de Validation:
python# ai_engine.py - Prompt Accounting spécifique
ACCOUNTING_PROMPT = """
MISSION: Extraire données comptables manuscrites.
STRUCTURE CIBLE (7 colonnes Excel):
- DATE, ACCOUNT (Incomes/blank), ITEM, DESCRIPTION, 
  CASH_IN, CASH_OUT, TOTAL_CASH, CREDIT_IN, TOTAL_CREDIT

RÈGLES STRICTES:
1. Si "Incomes" écrit → ACCOUNT = "Incomes", montant en CASH_IN ou CREDIT_IN
2. Si dépense → ACCOUNT vide, montant en CASH_OUT
3. Calculer TOTAL_CASH = Cash précédent + CASH_IN - CASH_OUT
4. Relever les "Staff Totals" écrits en bas (pour vérification)
5. ZERO NULL: Si pas de revenus trouvés pour un jour → Ligne à 0 forcée

OUTPUT JSON:
{
  "bar_id": 1,
  "date_on_page": "01/11/2025",
  "entries": [
    {"date": "01/11/2025", "account": "Incomes", "item": "", 
     "description": "", "cash_in": 92305, "cash_out": 0, 
     "total_cash": 92305, "credit_in": 124569, "total_credit": 124569},
    {"date": "01/11/2025", "account": "", "item": "Cleaning", 
     "description": "", "cash_in": 0, "cash_out": 1844, 
     "total_cash": 90461, "credit_in": 0, "total_credit": 124569}
  ],
  "staff_totals": {"cash": 71588, "credit": 124569}
}
"""
Actions Possibles:

EDIT DATA: Cellules éditables (contenteditable), mise à jour JSON en temps réel
REJECT: Supprime l'upload, retour à l'étape 3.2
VALIDATE:

sql  INSERT INTO accounting_entries (bar_id, date, account_type, item, 
                                   cash_in, cash_out, total_cash, 
                                   credit_in, total_credit, validated_by)
  VALUES (..., 'Seb');
```

---

### PHASE 4 : ANALYSE DATA (Phase 2 - Blueprint)
```
┌─────────────────────────────────────────────────────────┐
│  ANALYSE DATA                                     [Seb] │
│  ══════════════════════════════════════════════════════ │
│                                                         │
│  FILTERS:                                               │
│  Bar: [All ▼] | Period: [Nov 2025 ▼] | Type: [Sales ▼]│
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  📊 SALES TREND (Nov 2025)                       │  │
│  │  ─────────────────────────────────────────────── │  │
│  │                                                   │  │
│  │   [Line Chart: Sales par jour, 3 bars]          │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  🔍 CORRELATION: Sales vs Staffing (SHARK)       │  │
│  │  ─────────────────────────────────────────────── │  │
│  │                                                   │  │
│  │   [Scatter Plot: X=Nb Girls, Y=Sales THB]       │  │
│  │   R² = 0.73 (Strong correlation)                │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [EXPORT EXCEL]  [GENERATE REPORT PDF]                │
└─────────────────────────────────────────────────────────┘
Capacités Analytiques (Futures):

Dashboards pré-configurés: Sales, Expenses, Profitability
Correlations intelligentes:

Sales vs Nombre de filles (HR Data)
Expenses breakdown par catégorie
Anomalies detection (jours avec sales anormalement basses)


Comparaisons cross-bar: Quel bar est le plus profitable?
Exports: Excel, PDF, API JSON

Permissions Phiborg:

Accès READ-ONLY total
Peut changer filtres, générer rapports
Ne peut PAS modifier les données sources
Ne voit pas les boutons "Edit" ou "Delete"


🛠️ PLAN DE DÉVELOPPEMENT (Step-by-Step pour l'IA)
SPRINT 1 : FONDATIONS (Semaine 1)
Module 1.1 : Base de Données
bash# 1. Créer database/init.sql
CREATE TABLE users (...);
CREATE TABLE bars (...);
CREATE TABLE accounting_entries (...);
CREATE TABLE hr_data (...);
CREATE TABLE reports_data (...);

INSERT INTO users VALUES ('Seb', hash('sEb@1217'), 'admin');
INSERT INTO users VALUES ('Phiborg', hash('pHi@1217'), 'analyst');
INSERT INTO bars VALUES ('SHARK', 'shark', '#00FFFF');
Module 1.2 : Backend Auth
python# backend_api/auth.py
from passlib.context import CryptContext
from jose import jwt

pwd_context = CryptContext(schemes=["bcrypt"])

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm="HS256")

@app.post("/api/auth/login")
async def login(credentials: LoginSchema):
    user = db.query(User).filter_by(username=credentials.username).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    
    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "role": user.role}
Module 1.3 : Login Page (Matrix)
html<!-- templates/login.html -->
<div class="terminal">
  <div id="login-prompt">
    <span class="prompt-text"></span>
    <span class="cursor">█</span>
  </div>
</div>

<script src="/static/js/login.js"></script>
javascript// static/js/login.js
let stage = 'username';
let username = '';
let password = '';

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (stage === 'username') {
      username = getCurrentInput();
      showPasswordPrompt();
    } else {
      password = getCurrentInput();
      submitLogin();
    }
  } else if (e.key.length === 1) {
    appendCharacter(e.key);
  }
});

async function submitLogin() {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({username, password})
  });
  
  if (response.ok) {
    const {access_token, role} = await response.json();
    localStorage.setItem('token', access_token);
    localStorage.setItem('role', role);
    window.location.href = '/dashboard';
  } else {
    showAccessDenied();
  }
}
TEST MODULE 1 :
bash# Depuis SSH
curl -X POST http://192.168.1.43:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Seb","password":"sEb@1217"}'

# Output attendu: {"access_token":"eyJ...", "role":"admin"}

SPRINT 2 : DASHBOARD & ROUTING (Semaine 2)
Module 2.1 : Dashboard Page
python# routes.py
@app.get("/dashboard")
async def dashboard(user: User = Depends(get_current_user)):
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "user": user,
        "inject_enabled": user.role == "admin",
        "analyse_enabled": True,
        "pending_validations": db.query(AccountingEntry)
                                 .filter_by(validated_by=None).count()
    })
html<!-- templates/dashboard.html -->
<div class="dashboard-grid">
  <div class="card {% if not inject_enabled %}disabled{% endif %}" 
       onclick="{% if inject_enabled %}location.href='/inject'{% endif %}">
    <h2>INJECT DATA</h2>
    <p>{% if inject_enabled %}[ACTIVE]{% else %}[ADMIN ONLY]{% endif %}</p>
  </div>
  
  <div class="card disabled">
    <h2>ANALYSE DATA</h2>
    <p>[PHASE 2]</p>
  </div>
</div>
TEST MODULE 2:
bash# Navigateur PC
http://192.168.1.43:8000/dashboard

# Vérifier:
# - Seb voit "INJECT DATA [ACTIVE]"
# - Phiborg voit "INJECT DATA [ADMIN ONLY]" (grisé)

SPRINT 3 : INJECT FLOW (Semaine 3-4)
Module 3.1 : Bar & Type Selection
python# routes.py
@app.get("/inject")
async def inject_page(user: User = Depends(require_admin)):
    bars = db.query(Bar).all()
    data_types = [
        {"id": "accounting", "name": "Accounting", "enabled": True},
        {"id": "hr", "name": "HR Data", "enabled": False},
        {"id": "reports", "name": "Reports", "enabled": False}
    ]
    return templates.TemplateResponse("inject.html", {
        "bars": bars,
        "data_types": data_types
    })

@app.post("/api/inject/select")
async def save_selection(selection: SelectionSchema, session: Session):
    session["bar_id"] = selection.bar_id
    session["data_type"] = selection.data_type
    return {"next": "/inject/upload"}
Module 3.2 : Upload & IA Analysis
python# routes.py
@app.post("/api/inject/upload")
async def upload_image(
    file: UploadFile, 
    bar_id: int, 
    data_type: str,
    user: User = Depends(require_admin)
):
    # 1. Sauvegarder temporairement
    temp_path = f"/tmp/{uuid4()}.jpg"
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    
    # 2. Appel IA
    if data_type == "accounting":
        result = analyze_accounting_image(temp_path, bar_id)
    elif data_type == "hr":
        result = analyze_hr_image(temp_path, bar_id)  # Phase 2
    
    # 3. Retourner JSON pour SAS
    return {
        "entries": result["entries"],
        "staff_totals": result["staff_totals"],
        "image_url": f"/uploads/{os.path.basename(temp_path)}"
    }
Module 3.3 : SAS Validation (Ton index.html adapté)
html<!-- templates/accounting_sas.html -->
<div class="sas-container">
  <div class="image-preview">
    <img id="uploaded-image" src="{{ image_url }}" />
  </div>
  
  <div class="data-grid">
    <table id="accounting-table">
      <thead>
        <tr>
          <th>DATE</th><th>ACCOUNT</th><th>ITEM</th>
          <th>CASH IN</th><th>CASH OUT</th><th>TOTAL CASH</th>
          <th>CREDIT IN</th><th>TOTAL CREDIT</th>
        </tr>
      </thead>
      <tbody id="table-body">
        <!-- Généré par JS depuis le JSON IA -->
      </tbody>
    </table>
    
    <div class="validation-panel">
      <div class="totals-comparison">
        <div>Staff Totals: Cash {{ staff_totals.cash }} | Credit {{ staff_totals.credit }}</div>
        <div>IA Calculation: Cash <span id="calc-cash"></span> | Credit <span id="calc-credit"></span></div>
        <div id="status-indicator">🟢 ALL CLEAR</div>
      </div>
      
      <div class="actions">
        <button onclick="rejectData()">← REJECT</button>
        <button onclick="validateData()">✓ VALIDATE & SAVE</button>
      </div>
    </div>
  </div>
</div>
javascript// static/js/inject.js
function renderTable(entries) {
  const tbody = document.getElementById('table-body');
  let runningCash = 0;
  let runningCredit = 0;
  
  entries.forEach(entry => {
    runningCash += (entry.cash_in - entry.cash_out);
    runningCredit += entry.credit_in;
    
    const row = `
      <tr>
        <td>${entry.date}</td>
        <td contenteditable>${entry.account}</td>
        <td contenteditable>${entry.item}</td>
        <td contenteditable>${entry.cash_in}</td>
        <td contenteditable>${entry.cash_out}</td>
        <td class="calculated">${runningCash}</td>
        <td contenteditable>${entry.credit_in}</td>
        <td class="calculated">${runningCredit}</td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
  
  // Vérification
  document.getElementById('calc-cash').textContent = runningCash;
  document.getElementById('calc-credit').textContent = runningCredit;
  
  if (runningCash !== staffTotals.cash || runningCredit !== staffTotals.credit) {
    document.getElementById('status-indicator').innerHTML = '🔴 MISMATCH';
  }
}

async function validateData() {
  const entries = extractTableData(); // Parse le HTML édité
  
  const response = await fetch('/api/inject/validate', {
    method: 'POST',
    body: JSON.stringify({
      bar_id: currentBarId,
      entries: entries
    })
  });
  
  if (response.ok) {
    alert('✓ Data saved successfully!');
    window.location.href = '/dashboard';
  }
}
Module 3.4 : Sauvegarde DB
python# routes.py
@app.post("/api/inject/validate")
async def save_accounting_data(
    data: AccountingValidationSchema,
    user: User = Depends(require_admin)
):
    # Insertion batch
    for entry in data.entries:
        db_entry = AccountingEntry(
            bar_id=data.bar_id,
            date=entry.date,
            account_type=entry.account,
            item=entry.item,
            description=entry.description,
            cash_in=entry.cash_in,
            cash_out=entry.cash_out,
            total_cash=entry.total_cash,
            credit_in=entry.credit_in,
            total_credit=entry.total_credit,
            validated_by=user.username,
            created_at=datetime.now()
        )
        db.add(db_entry)
    
    db.commit()
    
    # Export Excel (optionnel)
    export_to_excel(data.bar_id, data.entries)
    
    return {"status": "success", "entries_saved": len(data.entries)}
TEST MODULE 3 COMPLET:
bash# 1. Login comme Seb
# 2. Dashboard → INJECT DATA
# 3. Sélectionner: SHARK + Accounting
# 4. Upload une photo test
# 5. Vérifier JSON retourné dans DevTools Network
# 6. Éditer une cellule dans le tableau
# 7. Cliquer VALIDATE
# 8. Vérifier en DB:
docker exec -it postgres_container psql -
U seb -d digital_shadow
SELECT * FROM accounting_entries WHERE bar_id=1 ORDER BY date DESC LIMIT 10;
```

---

### SPRINT 4 : POLISH & SECURITY (Semaine 5)

#### Module 4.1 : Gestion Sessions
```python
# auth.py - Middleware
@app.middleware("http")
async def session_middleware(request: Request, call_next):
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY)
            request.state.user = db.query(User).filter_by(username=payload["sub"]).first()
        except:
            request.state.user = None
    
    response = await call_next(request)
    return response

def require_admin(request: Request):
    if not request.state.user or request.state.user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return request.state.user
```

#### Module 4.2 : Logging & Audit Trail
```python
# db_manager.py
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)  # "login", "inject", "validate", "export"
    bar_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.now)
    ip_address = Column(String)

# routes.py - Log chaque action
@app.post("/api/inject/validate")
async def save_data(...):
    # ... code sauvegarde ...
    
    audit = AuditLog(
        user_id=user.id,
        action="validate_accounting",
        bar_id=data.bar_id,
        ip_address=request.client.host
    )
    db.add(audit)
    db.commit()
```

#### Module 4.3 : Responsive Mobile
```css
/* static/css/dashboard.css */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .sas-container {
    flex-direction: column;
  }
  
  .image-preview {
    width: 100%;
    height: 40vh;
  }
}
```

---

## 📊 DONNÉES DE SORTIE (Format Final)

### Structure Excel Export (Par Bar)
```
SHARK_Accounting_Nov2025.xlsx

Sheet 1: "Transactions"
┌──────────┬─────────┬──────────┬─────────┬─────────┬──────────┬──────────┬─────────────┐
│   DATE   │ ACCOUNT │   ITEM   │ CASH IN │CASH OUT │TOTAL CASH│ CREDIT IN│TOTAL CREDIT │
├──────────┼─────────┼──────────┼─────────┼─────────┼──────────┼──────────┼─────────────┤
│01/11/2025│ Incomes │          │  92,305 │       0 │   92,305 │  124,569 │    124,569  │
│01/11/2025│         │ Cleaning │       0 │   1,844 │   90,461 │        0 │    124,569  │
│01/11/2025│         │Maintenance│      0 │   1,280 │   89,181 │        0 │    124,569  │
│...       │         │          │         │         │          │          │             │
└──────────┴─────────┴──────────┴─────────┴─────────┴──────────┴──────────┴─────────────┘

Sheet 2: "Summary"
Total Cash In:   2,412,598 THB
Total Cash Out:  2,341,010 THB
Net Cash:           71,588 THB
Total Credit:    1,020,491 THB
Period: 01/11/2025 - 30/11/2025
Validated by: Seb
```

### API JSON (Pour futures intégrations)
```json
GET /api/accounting/entries?bar_id=1&start_date=2025-11-01&end_date=2025-11-30

{
  "bar": "SHARK",
  "period": {"start": "2025-11-01", "end": "2025-11-30"},
  "entries": [
    {
      "date": "2025-11-01",
      "account": "Incomes",
      "item": "",
      "cash_in": 92305,
      "cash_out": 0,
      "total_cash": 92305,
      "credit_in": 124569,
      "total_credit": 124569,
      "validated_by": "Seb",
      "created_at": "2025-11-02T08:30:00Z"
    }
  ],
  "totals": {
    "cash_in": 2412598,
    "cash_out": 2341010,
    "net_cash": 71588,
    "credit_in": 1020491
  }
}
```

---

## 🚀 PHASE 2 : ROADMAP FUTURE

### Module HR Data (Q1 2026)
```python
# Nouvelle structure IA
HR_PROMPT = """
MISSION: Extraire données RH depuis photos/rapports.
DONNÉES CIBLES:
- Date, Shift (Day/Night), Nombre de filles présentes, Notes

OUTPUT JSON:
{
  "date": "2025-11-01",
  "shift": "night",
  "nb_girls": 12,
  "notes": "High traffic weekend"
}
"""

# Nouveau endpoint
@app.post("/api/inject/upload/hr")
async def upload_hr_data(...):
    result = analyze_hr_image(temp_path, bar_id)
    # Stockage dans hr_data table
```

### Module Reports (Q1 2026)
- Ingestion rapports manuscrits/imprimés
- Extraction montants comptables + réconciliation avec Accounting
- Détection anomalies automatique

### Module Analytics (Q2 2026)
```python
# Exemples de requêtes analytiques
@app.get("/api/analytics/correlation")
async def sales_vs_staffing(bar_id: int, period: str):
    # JOIN accounting_entries + hr_data
    query = """
        SELECT 
            a.date,
            SUM(a.cash_in + a.credit_in) as total_sales,
            h.nb_girls
        FROM accounting_entries a
        JOIN hr_data h ON a.date = h.date AND a.bar_id = h.bar_id
        WHERE a.bar_id = %s
        GROUP BY a.date, h.nb_girls
    """
    results = db.execute(query, (bar_id,))
    
    # Calcul corrélation Pearson
    correlation = calculate_correlation(results)
    
    return {
        "data": results,
        "correlation_coefficient": correlation,
        "insight": "Strong positive correlation (R²=0.73)"
    }
```

---

## 🛡️ SÉCURITÉ & BACKUP

### 1. Authentification Renforcée
```python
# Après login réussi, log IP + device
audit_login(user, request.client.host, request.headers.get("User-Agent"))

# Rate limiting (brute force protection)
@limiter.limit("5 per minute")
@app.post("/api/auth/login")
async def login(...):
    ...
```

### 2. Backup Automatique
```bash
# Cron journalier (4h du matin)
0 4 * * * docker exec postgres_container pg_dump -U seb digital_shadow | gzip > /home/seb/backups/db_$(date +\%Y\%m\%d).sql.gz

# Rotation 30 jours
find /home/seb/backups -name "db_*.sql.gz" -mtime +30 -delete
```

### 3. HTTPS (Production)
```bash
# Avec Caddy (reverse proxy)
docker run -d \
  -p 443:443 \
  -v /home/seb/Caddyfile:/etc/caddy/Caddyfile \
  caddy:latest

# Caddyfile
digitalshadow.local {
  reverse_proxy localhost:8000
  tls internal
}
```

---

## 📋 CHECKLIST PRÉ-PRODUCTION

### Infrastructure
- [ ] Raspberry Pi boot sur NVMe validé
- [ ] Docker Compose démarre au boot (systemd)
- [ ] Backup automatique configuré (cron)
- [ ] Monitoring disk space (alerte si <10GB)
- [ ] UPS (onduleur) branché (coupures électriques Thaïlande)

### Application
- [ ] Login Matrix fonctionnel (test 2 users)
- [ ] Dashboard permissions OK (Admin vs Analyst)
- [ ] Inject flow complet testé (upload → SAS → DB)
- [ ] Export Excel généré et validé
- [ ] Logs audit enregistrés correctement
- [ ] Mobile responsive testé (iPhone + Android)

### Sécurité
- [ ] Passwords hashés (bcrypt, salt)
- [ ] JWT avec expiration (24h)
- [ ] Rate limiting activé
- [ ] HTTPS configuré (Tailscale ou Caddy)
- [ ] Firewall iptables (port 8000 = localhost only)

### Documentation
- [ ] Guide utilisateur Phil (PDF + vidéo)
- [ ] README technique pour Seb
- [ ] Scripts maintenance (/home/seb/scripts/)
- [ ] Contact d'urgence si crash

---

## 🎓 GUIDE RAPIDE POUR PHIL (Opérateur)

### Démarrage Quotidien
1. **Vérifier que le boîtier est allumé** (LED rouge fixe)
2. **Ouvrir le navigateur** sur ton téléphone/ordinateur
3. **Aller sur** : `http://192.168.1.43:8000` (Marque-page!)
4. **Taper ton login** : `Phiborg` puis `pHi@1217`

### Consulter les Données (Quand actif)
1. Cliquer sur **ANALYSE DATA**
2. Sélectionner le bar (Shark/Mandarin/Red Dragons)
3. Choisir la période (mois/année)
4. Cliquer sur **GENERATE REPORT** pour Excel

### En Cas de Problème
- **App ne charge pas** : Appeler Seb, ne touche à rien
- **Mauvaises données** : Ne PAS valider, prendre photo et envoyer à Seb
- **Oubli de mot de passe** : Seul Seb peut reset

---

## 🔧 MAINTENANCE SEB (Admin)

### Commandes Utiles
```bash
# Status des conteneurs
docker ps

# Logs en temps réel
docker logs -f fastapi_container

# Restart si freeze
docker compose restart

# Backup manuel
docker exec postgres_container pg_dump -U seb digital_shadow > backup_now.sql

# Ajouter un user
docker exec -it postgres_container psql -U seb digital_shadow
INSERT INTO users (username, password_hash, role) VALUES ('NewUser', '$2b$...', 'analyst');
```

### Ajout d'un 4ème Bar
```python
# 1. Ajouter en DB
INSERT INTO bars (name, slug, color_theme) VALUES ('TIGER', 'tiger', '#FF6600');

# 2. Ajouter prompt IA dans ai_engine.py
BAR_PROMPTS["tiger"] = """
CONTEXTE: Bar 'TIGER'.
STRUCTURE: [Description spécifique]
"""

# 3. Update HTML select dans inject.html
<option value="4">Tiger</option>
```

### Monitoring
```bash
# Espace disque
df -h /dev/nvme0n1p1

# RAM usage
free -h

# Température Pi
vcgencmd measure_temp

# Si > 75°C : Vérifier Active Cooler
```

---

## 🎯 RÉCAPITULATIF : L'APP EN 3 LIGNES

1. **INJECT** : Upload photos cahiers → IA extrait données → Humain valide → Stockage DB
2. **STORAGE** : PostgreSQL centralisé (3 bars × 3 types de data) avec audit trail complet
3. **ANALYSE** : Corrélations cross-sources (Sales vs HR vs Reports) pour insights business

**Philosophie** : *"L'IA propose, l'Humain dispose, la Data révèle."*

---

## 📞 CONTACTS & RESSOURCES

- **Tech Lead** : Seb (SSH: `ssh seb@192.168.1.43`)
- **IA Assistant** : Claude Sonnet 4 (Anthropic)
- **Repo Docs** : `/home/seb/digital-shadow/docs/`
- **Backup Location** : `/home/seb/backups/`
- **Support Gemini** : https://ai.google.dev/gemini-api/docs

---

**VERSION:** 4.0 Final  
**DERNIÈRE MAJ:** 8 Décembre 2025  
**STATUT:** 🟢 READY FOR IMPLEMENTATION

*"From Chaos to Clarity, One Validated Entry at a Time."*</parameter>