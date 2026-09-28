# Building VoxMentor

This document describes how to build and verify VoxMentor for local development and testing.

## Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18 or higher (LTS recommended)
- **PostgreSQL**: 14 or higher

## Backend Build & Setup

The backend uses Python `venv` and `pip`.

```powershell
cd backend
# Create virtual environment
python -m venv venv

# Activate environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head
```

## Frontend Build & Setup

The frontend uses Vite and TypeScript.

```powershell
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
```

## Running Tests

### Backend Testing

The backend uses `pytest` and runs against a local SQLite in-memory database by default.

```powershell
cd backend
.\venv\Scripts\activate
pytest -v
```

### Frontend Validation

The frontend uses strict TypeScript compilation.

```powershell
cd frontend
npm run build
```

## Troubleshooting

- **Alembic failures**: Ensure `DATABASE_URL` is correctly formatted and escaped (e.g. replacing `@` with `%40` in passwords).
- **npm script policies**: On Windows PowerShell, if `npm run` fails due to execution policies, use `npm.cmd run build` or `npm.cmd run dev`.
