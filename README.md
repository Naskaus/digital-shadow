# DIGITAL-SHADOW v0.2

Staff Performance Management System

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Create .env from example
copy .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --port 8001 --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Production Build
```bash
cd frontend
npm run build
# Built files will be in frontend/dist/
# Backend serves these from /static
```

## Project Structure
```
Digital-Shadow/
├── backend/           # FastAPI application
│   ├── alembic/       # Database migrations
│   ├── app/           # Application code
│   └── requirements.txt
├── frontend/          # React + Vite application
│   ├── src/
│   └── package.json
└── Staff_Performance/ # Project documentation
    ├── context.md     # READ ONLY
    └── AI_Memory.md   # Session summaries
```

## Deployment
Single service on port 8001 served via cloudflared at staff.naskaus.com
