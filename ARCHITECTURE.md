# VoxMentor System Architecture

This document describes the high-level architecture and subsystem components of VoxMentor.

## 1. High-Level System Architecture

```mermaid
flowchart LR
    Browser[User Browser]
    subgraph Frontend [React Frontend]
        Auth[Authentication]
        Dash[Dashboard & Reports]
        RTC[Agora Web SDK]
    end
    subgraph Backend [FastAPI Backend]
        API[API Endpoints]
        SessionSvc[Session Service]
        EvalSvc[Evaluation Service]
    end
    DB[(PostgreSQL)]
    Agora[Agora Conversation AI]
    LLM[LLM Provider]
    Google[Google OAuth]

    Browser <--> Frontend
    Auth <--> API
    Dash <--> API
    Frontend -- HTTP --> API
    API <--> DB
    API <--> SessionSvc
    SessionSvc <--> EvalSvc
    EvalSvc <--> LLM
    RTC <--> Agora
    API -- Connects --> Agora
    API <--> Google
```

## 2. Real-Time Voice Flow (Live Path)

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Agora Conversation AI

    User->>Frontend: Start Practice Session
    Frontend->>Backend: POST /api/v1/sessions/{id}/start
    Backend->>Agora Conversation AI: HTTP POST /join (Pipeline Config)
    Agora Conversation AI-->>Backend: OK (Agent Joined)
    Backend-->>Frontend: Agora Token & Agent UID
    Frontend->>Agora Conversation AI: Web SDK Join Channel
    User->>Agora Conversation AI: Speaks (Audio Stream)
    Agora Conversation AI->>User: Responds (Audio Stream)
```

## 3. Post-Session Evaluation Flow

```mermaid
flowchart TD
    A[Completed Session] --> B[Load Conversation Messages]
    B --> C{Valid User Responses?}
    C -- No --> D[Mark Session Incomplete]
    C -- Yes --> E[Evaluation Service]
    E --> F[LLM Provider]
    F --> G[Structured JSON Evaluation]
    G --> H[Pydantic Validation]
    H --> I[Persist to PostgreSQL]
    I --> J[Display Report]
```

## 4. Authentication Flow

VoxMentor utilizes a dual-authentication architecture supporting both traditional Email/Password and Google OAuth 2.0.

```mermaid
sequenceDiagram
    participant Browser
    participant API
    participant Google
    participant DB

    Browser->>API: GET /api/v1/auth/google
    API-->>Browser: HTTP 307 Redirect (Sets HttpOnly State Cookie)
    Browser->>Google: OAuth Login
    Google-->>Browser: Redirect to Callback with Code
    Browser->>API: GET /api/v1/auth/google/callback
    API->>API: Validate State Cookie
    API->>Google: Exchange Code for Token
    API->>Google: Fetch User Info
    API->>DB: Link / Create User
    API-->>Browser: Redirect with JWT
```

## 5. Security Boundaries

- **Frontend**: Contains no secrets. `VITE_` variables are public.
- **Backend**: Holds the `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, `AI_API_KEY`, and `AGORA_APP_CERTIFICATE`.
- **Database**: Stores hashed passwords (`bcrypt`).
