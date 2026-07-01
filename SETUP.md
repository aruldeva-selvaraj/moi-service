# Moi Wedding App - Setup Guide

## South Indian Wedding Moi (Cash Gift) Management System

---

## Prerequisites

- Python 3.11+
- Node.js 20+ and npm
- PostgreSQL 15+
- Angular CLI 21: `npm install -g @angular/cli@21`

---

## Step 1: Database Setup

1. Open pgAdmin or psql
2. Run the setup script:
   ```
   psql -U postgres -f backend/setup_db.sql
   ```
   Or manually create database `moi_wedding_db`

---

## Step 2: Backend Setup (FastAPI)

```bash
cd backend

# Copy environment config
copy .env.example .env

# Edit .env with your PostgreSQL password
notepad .env

# Run the start script (auto-creates venv and installs deps)
start.bat
```

**OR manually:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API Docs: http://localhost:8000/docs

---

## Step 3: Frontend Setup (Angular 21)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
```

Frontend runs at: http://localhost:4200

---

## Features

### Dashboard
- Total weddings, guests, moi collected, average gift
- Recent weddings overview
- Quick action buttons

### Wedding Management
- Create weddings with groom/bride names, date, venue
- Edit and delete weddings
- View per-wedding statistics

### Moi Entry Recording
- Record guest name, relationship, side (bride/groom)
- Amount with payment mode (Cash/Cheque/Online/DD)
- Cheque number / Transaction reference
- Guest city, phone, notes
- Who received the moi

### Moi List View
- Filter by wedding, side, payment mode
- Search by guest name
- Paginated results
- Delete entries

### Reports & Analytics
- Per-wedding detailed breakdown
- Side-wise split (Bride's vs Groom's)
- Payment mode analysis
- Relationship-wise contribution summary
- Print-ready report layout

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/weddings/ | List all weddings |
| POST | /api/weddings/ | Create wedding |
| GET | /api/weddings/{id} | Get wedding details |
| PUT | /api/weddings/{id} | Update wedding |
| DELETE | /api/weddings/{id} | Delete wedding |
| GET | /api/weddings/{id}/report | Wedding report |
| GET | /api/moi/ | List moi entries |
| POST | /api/moi/ | Create moi entry |
| GET | /api/moi/summary | Summary statistics |
| GET | /api/moi/by-relationship | Group by relationship |
| PUT | /api/moi/{id} | Update entry |
| DELETE | /api/moi/{id} | Delete entry |

---

## Tech Stack

- **Frontend**: Angular 21 (Standalone Components, Signals)
- **UI**: Angular Material (Warm saffron/gold South Indian theme)
- **Backend**: Python FastAPI with async SQLAlchemy
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy 2.0 (async)
- **Validation**: Pydantic v2
