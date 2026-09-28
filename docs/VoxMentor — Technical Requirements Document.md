# VoxMentor
## Technical Requirements Document (TRD)

**Version:** 1.0  
**Architecture:** Modular Monolith  
**Frontend:** React + TypeScript  
**Backend:** FastAPI + Python  
**Database:** PostgreSQL  
**Real-Time AI:** Agora Conversation AI

---

# 1. Architecture Principle

VoxMentor should use a **modular monolith** rather than microservices.

```text
Frontend
   │
   │ REST API
   ▼
FastAPI Backend
   │
   ├── Auth Module
   ├── User Module
   ├── Session Module
   ├── Agora Module
   ├── AI Evaluation Module
   └── Analytics Module
          │
          ▼
      PostgreSQL
```

Agora handles the real-time communication layer.

The backend handles application state, authentication, session management, and evaluation.

---

# 2. Repository Structure

Recommended structure:

```text
voxmentor/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── db/
│   │   └── main.py
│   │
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   └── WORKFLOW.md
│
├── README.md
└── .gitignore
```

---

# 3. Frontend Architecture

Use:

```text
React
├── Pages
├── Components
├── Hooks
├── API Services
├── State
└── Types
```

### Pages

```text
/login
/register
/dashboard
/session/new
/session/:id
/session/:id/report
/history
/profile
```

---

# 4. Backend Architecture

FastAPI modules:

```text
/api/v1/auth
/api/v1/users
/api/v1/sessions
/api/v1/agora
/api/v1/evaluations
/api/v1/dashboard
```

---

# 5. Database Design

## users

```text
id
email
password_hash
name
created_at
updated_at
```

## sessions

```text
id
user_id
mode
topic
difficulty
status
started_at
ended_at
duration
created_at
```

## evaluations

```text
id
session_id
overall_score
technical_score
communication_score
relevance_score
confidence_score
summary
strengths
weaknesses
recommendations
created_at
```

## conversation_messages

```text
id
session_id
role
content
timestamp
```

For the hackathon MVP, conversation storage can be limited to the data required for evaluation and history.

---

# 6. Authentication

Use JWT-based authentication.

Flow:

```text
Register
   ↓
Hash password
   ↓
Store user
   ↓
Login
   ↓
Verify password
   ↓
Generate JWT
   ↓
Frontend stores authentication state
```

Protected endpoints must validate the JWT.

Passwords must NEVER be stored in plaintext.

---

# 7. Agora Integration

Agora should be isolated inside:

```text
backend/app/services/agora/
```

and the corresponding frontend integration should be isolated inside:

```text
frontend/src/services/agora/
```

The frontend must never contain sensitive Agora credentials or server-side secrets.

Backend responsibilities:

- Generate required temporary credentials/tokens where applicable.
- Create/manage session metadata.
- Validate session ownership.
- Provide configuration required by the client.

Frontend responsibilities:

- Connect to Agora.
- Join/leave the voice session.
- Handle microphone state.
- Display connection state.
- Handle connection failures gracefully.

---

# 8. AI Architecture

Separate the conversational AI from evaluation.

```text
                Agora Conversation AI
                         │
                         ▼
                  Live Conversation
                         │
                         ▼
                  Session Data
                         │
                         ▼
                 Evaluation Service
                         │
                         ▼
               Structured Evaluation
```

Do not use the evaluation model to control the live conversation.

This separation makes the system easier to debug.

---

# 9. Evaluation Output

The evaluator should return structured JSON.

Example:

```json
{
  "overall_score": 82,
  "communication_score": 79,
  "relevance_score": 88,
  "confidence_score": 75,
  "technical_score": 86,
  "summary": "The candidate demonstrated strong fundamentals.",
  "strengths": [
    "Good technical fundamentals",
    "Relevant examples"
  ],
  "weaknesses": [
    "Answers could be more concise",
    "Confidence can improve"
  ],
  "recommendations": [
    "Practice system design",
    "Practice concise explanations"
  ]
}
```

The backend must validate this response using Pydantic before storing it.

---

# 10. API Design

## Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

## Sessions

```text
POST /api/v1/sessions
GET  /api/v1/sessions
GET  /api/v1/sessions/{session_id}
POST /api/v1/sessions/{session_id}/end
```

## Agora

```text
POST /api/v1/agora/token
```

## Evaluation

```text
POST /api/v1/sessions/{session_id}/evaluate
GET  /api/v1/sessions/{session_id}/evaluation
```

## Dashboard

```text
GET /api/v1/dashboard/summary
```

---

# 11. API Error Format

All API errors should use a consistent structure.

```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session could not be found."
  }
}
```

Do not expose stack traces to users.

---

# 12. Environment Variables

Backend:

```text
DATABASE_URL=
JWT_SECRET=
JWT_ALGORITHM=
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
AI_API_KEY=
```

Frontend:

```text
VITE_API_BASE_URL=
VITE_AGORA_APP_ID=
```

Never commit `.env` files.

Provide:

```text
.env.example
```

---

# 13. Security Requirements

The system must:

- Hash passwords.
- Validate input.
- Use JWT authentication.
- Validate session ownership.
- Protect sensitive endpoints.
- Never expose API keys.
- Use CORS configuration.
- Avoid SQL injection through SQLAlchemy.
- Avoid arbitrary user-controlled prompt execution.
- Validate AI-generated structured output.
- Log server errors without exposing secrets.

---

# 14. Logging

Use structured application logging.

Log:

- Authentication failures
- Session creation
- Session completion
- Agora connection errors
- Evaluation failures
- Unexpected exceptions

Never log:

- Passwords
- JWT secrets
- API keys
- Sensitive tokens

---

# 15. Testing

Minimum backend tests:

```text
test_register
test_login
test_invalid_login
test_protected_endpoint
test_create_session
test_session_ownership
test_end_session
test_evaluation_schema
test_health_check
```

Frontend tests should cover critical components only.

---

# 16. Health Check

Backend:

```text
GET /api/v1/health
```

Expected:

```json
{
  "status": "healthy"
}
```

---

# 17. Reliability Strategy

Avoid unnecessary complexity.

Use:

```text
Retry transient AI/API failures
       ↓
Graceful error message
       ↓
Preserve session state
       ↓
Allow user to retry
```

If Agora fails:

```text
"Unable to connect to the voice service.
Please try again."
```

Never display raw technical exceptions.

---

# 18. Performance

For MVP:

- Paginate session history.
- Avoid unnecessary database queries.
- Use TanStack Query caching.
- Lazy-load non-critical frontend pages.
- Keep API responses small.
- Avoid storing large audio files unless required.

---

# 19. Deployment

Recommended:

```text
GitHub
   │
   ├── Frontend → Vercel
   │
   └── Backend → Render/Railway
                     │
                     ▼
                 PostgreSQL
```

The exact provider can be changed later.

---

# 20. Development Priority

Implement in this order:

```text
1. Project scaffold
2. Backend health check
3. Database
4. Authentication
5. Frontend authentication
6. Dashboard
7. Session creation
8. Agora integration
9. Live voice conversation
10. Session termination
11. Evaluation
12. Report
13. History
14. Progress dashboard
15. UI polish
16. Testing
17. Deployment
```

Never implement all features simultaneously.