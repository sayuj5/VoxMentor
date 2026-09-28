<p align="center">
  <img src="frontend/public/logo.png" alt="VoxMentor Logo" width="130">
</p>

<h1 align="center">VoxMentor</h1>

<p align="center">
  <strong>Talk. Practice. Improve.</strong><br>
  A Real-Time AI Career Mentor for Interviews, Learning & Professional Communication.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
</p>

---

## Overview

VoxMentor is a **real-time conversational AI platform** that helps students and job seekers master their communication and interview skills through natural voice interaction.

Traditional interview prep is text-heavy, static, and provides limited feedback. VoxMentor solves this by placing users in dynamic, real-time **voice conversations** with an adaptive AI agent — one that listens, adapts follow-up questions, and generates structured post-session evaluations to track progress over time.

> **Core technology**: Agora Conversation AI powers the real-time voice interaction layer.

---

## Key Features

- **Real-Time AI Voice Conversation** — Ultra-low latency voice sessions via Agora Conversation AI
- **4 Specialized Practice Modes** — Technical Interview, HR Interview, Learning Mentor, Communication Coach
- **Adaptive Questioning** — The AI adapts based on user responses and topic difficulty
- **Post-Session AI Evaluation** — LLM-powered structured scoring with strengths, weaknesses, and recommendations
- **Session Dashboard** — Persistent history, average scores, and progress tracking
- **Dual Authentication** — Email/Password and Google OAuth 2.0 with secure JWT sessions
- **Premium UI** — Dark-themed Tailwind CSS design with a Three.js/Fiber 3D hero, Framer Motion animations, and an animated footer

---

## Why VoxMentor?

| Traditional Prep | VoxMentor |
| :--- | :--- |
| Static list of questions | Dynamic, real-time voice conversation |
| Text-heavy, passive reading | Natural speaking and listening |
| No conversational adaptation | Adaptive AI follow-up questions |
| Manual self-assessment | Automated structured post-session evaluation |
| No progress tracking | Persistent session history and score trends |

---

## Practice Modes

| Mode | Purpose | Examples |
|------|---------|---------|
| **Technical Interview** | Technical interview practice | Programming, CS fundamentals, system design |
| **HR Interview** | Behavioral interview practice | Situational and behavioral questions |
| **Learning Mentor** | Concept understanding | Explanations, comprehension checks |
| **Communication Coach** | Professional speaking | Clarity, fluency, confidence, vocabulary |

---

## How It Works

```mermaid
flowchart TD
    A[User] --> B[VoxMentor Web App]
    B --> C[Authentication]
    B --> D[Create Session]
    D --> E[Agora Conversation AI]
    E --> F[Real-Time Voice Conversation]
    F --> G[Session Completion]
    G --> H[Evaluation Service]
    H --> I[LLM Analysis]
    I --> J[Structured Evaluation]
    J --> K[(PostgreSQL)]
    K --> L[Session Report]
    K --> M[History]
    K --> N[Dashboard Progress]
```

---

## System Architecture

```mermaid
flowchart LR
    Browser[User Browser]

    subgraph FE [React Frontend]
        UI[UI / Pages]
        Auth[Authentication]
        Session[Session Interface]
        Dash[Report & Dashboard]
    end

    subgraph BE [FastAPI Backend]
        API[Auth Service]
        SessionSvc[Session Service]
        EvalSvc[Evaluation Service]
        AgoraSvc[Agora Service]
    end

    DB[(PostgreSQL)]
    Google[Google OAuth]
    Agora[Agora Conversation AI]
    LLM[AI Evaluation Model]

    Browser <--> FE
    FE -- HTTP/REST --> BE
    API --> Google
    AgoraSvc --> Agora
    EvalSvc --> LLM
    BE --> DB
```

For detailed architecture with sequence diagrams, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, TanStack Query v5, Agora Web SDK, Recharts, Three.js, React Three Fiber, Framer Motion |
| **Backend** | Python 3.13, FastAPI, Pydantic, SQLAlchemy, PostgreSQL, Alembic, JWT (python-jose), bcrypt, HTTPX, pytest |
| **AI / Voice** | Agora Conversation AI (Pipeline-based) |
| **Auth** | JWT, Google OAuth 2.0 |

---

## Project Structure

```text
VOXMENTOR/
├── frontend/
│   ├── src/
│   │   ├── components/ui/      # Reusable UI components
│   │   ├── pages/              # Route-level pages
│   │   ├── services/           # API client & Agora RTC service
│   │   ├── stores/             # Auth context
│   │   └── layouts/            # App shell layout
│   ├── public/                 # Static assets (logo.png, favicon)
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── app/
│   │   ├── api/routes/         # FastAPI route handlers
│   │   ├── core/               # Config, security, logging
│   │   ├── db/                 # Database session
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic schemas
│   │   └── services/           # Agora & Evaluation services
│   ├── alembic/                # Database migrations
│   ├── tests/                  # pytest test suite
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── docs/                       # Extended documentation
├── ARCHITECTURE.md
├── BUILDING.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── ROADMAP.md
├── SECURITY.md
└── SETUP.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login with email/password |
| `GET` | `/api/v1/auth/me` | Get current user |
| `GET` | `/api/v1/auth/google` | Initiate Google OAuth flow |
| `GET` | `/api/v1/auth/google/callback` | Google OAuth callback |
| `POST` | `/api/v1/sessions` | Create a new practice session |
| `GET` | `/api/v1/sessions` | List user sessions |
| `GET` | `/api/v1/sessions/{id}` | Get session details |
| `POST` | `/api/v1/sessions/{id}/start` | Start session (joins Agora agent) |
| `POST` | `/api/v1/sessions/{id}/end` | End session (triggers evaluation) |
| `GET` | `/api/v1/sessions/{id}/evaluation` | Get session evaluation |
| `GET` | `/api/v1/dashboard/summary` | Get dashboard summary |
| `GET` | `/api/v1/health` | Health check |

---

## Local Development

See [SETUP.md](SETUP.md) for full setup instructions.

**Backend:**
```powershell
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/api/v1/health |

> Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env` and fill in your credentials.

---

## Testing

**Backend (34 tests):**
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -v
```

**Frontend build validation:**
```powershell
cd frontend
npm run build
```

---

## Security

- Passwords hashed with `bcrypt` via `passlib`
- JWT sessions with expiry enforcement
- Google OAuth CSRF protection via HttpOnly state cookie
- SQLAlchemy ORM for parameterized queries (SQL injection prevention)
- Strict separation of frontend public vars (`VITE_`) and backend secrets

See [SECURITY.md](SECURITY.md) for full details.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for completed milestones and future plans.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Hackathon / Project Context

VoxMentor was built as a **voice-first AI project** using the **Agora Conversation AI** platform as its core voice infrastructure. Agora provides the real-time RTC transport and conversational AI agent bindings that enable the ultra-low latency voice interaction at the heart of this product.

---

## Status

**Current Status: Feature-Complete — Pre-Deployment Ready**

The application has passed end-to-end QA with 34/34 backend tests passing and a clean frontend production build.

---

## License

MIT License — see [LICENSE](LICENSE) for details.