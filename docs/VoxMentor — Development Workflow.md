# VoxMentor
## Development & User Workflow

---

# 1. Complete User Journey

```text
                 OPEN VOXMENTOR
                       │
                       ▼
                 Login / Register
                       │
                       ▼
                   Dashboard
                       │
                       ▼
                Start New Session
                       │
                       ▼
              Select Session Mode
                       │
                       ▼
              Configure Session
                       │
                       ▼
                Create Session
                       │
                       ▼
             Request Agora Access
                       │
                       ▼
              Join Voice Session
                       │
                       ▼
            Agora Conversation AI
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
             User              AI
            speaks           responds
              │                 │
              └────────┬────────┘
                       │
                       ▼
                Adaptive Dialogue
                       │
                       ▼
                 End Session
                       │
                       ▼
                Save Session Data
                       │
                       ▼
                 AI Evaluation
                       │
                       ▼
               Generate Report
                       │
                       ▼
                Store Evaluation
                       │
                       ▼
              Display Performance
                       │
                       ▼
                Session History
```

---

# 2. Registration Workflow

```text
User
 ↓
Register
 ↓
Validate email/password
 ↓
Check existing user
 ↓
Hash password
 ↓
Create user
 ↓
Return authentication state
 ↓
Dashboard
```

---

# 3. Login Workflow

```text
Email + Password
       ↓
Backend
       ↓
Find User
       ↓
Verify Password
       ↓
Generate JWT
       ↓
Frontend
       ↓
Authenticated Dashboard
```

---

# 4. Start Session Workflow

```text
User selects:

Mode
Topic
Difficulty
Duration

        ↓

Frontend → POST /sessions

        ↓

Backend creates session

        ↓

Frontend requests Agora configuration

        ↓

Backend validates user/session

        ↓

Backend provides temporary Agora credentials

        ↓

Frontend connects to Agora

        ↓

Conversation AI starts

        ↓

Session = ACTIVE
```

---

# 5. Live Conversation Workflow

```text
AI asks question
       ↓
User speaks
       ↓
Agora transports real-time audio
       ↓
Conversation AI processes interaction
       ↓
AI generates response
       ↓
AI speaks
       ↓
Conversation continues
```

The AI receives session context:

```text
Mode
Topic
Difficulty
Conversation context
Session objective
```

---

# 6. Adaptive Questioning

```text
User Answer
     │
     ▼
AI interprets answer
     │
     ├── Strong
     │     ↓
     │   Increase difficulty
     │
     ├── Average
     │     ↓
     │   Ask related question
     │
     └── Weak
           ↓
       Simplify / clarify
```

The AI must never become completely off-topic.

---

# 7. End Session Workflow

```text
User clicks End Session
          ↓
Confirmation
          ↓
Leave Agora channel
          ↓
Mark session completed
          ↓
Store session data
          ↓
Trigger evaluation
          ↓
Generate structured evaluation
          ↓
Validate evaluation
          ↓
Store evaluation
          ↓
Show report
```

---

# 8. Evaluation Workflow

```text
Completed Session
       ↓
Retrieve conversation
       ↓
Build evaluation request
       ↓
AI Evaluation Model
       ↓
Structured JSON
       ↓
Pydantic Validation
       ↓
Valid?
   ┌───┴────┐
   │        │
  YES       NO
   │        │
   ▼        ▼
Store     Retry / Error
   │
   ▼
Performance Report
```

---

# 9. Dashboard Workflow

Dashboard retrieves:

```text
User information
       +
Session statistics
       +
Recent sessions
       +
Average score
       +
Progress
```

Display only information useful to the user.

---

# 10. Error Workflow

Every critical operation should have a failure path.

Example:

```text
Start Agora
    │
    ├── Success → Voice Session
    │
    └── Failure
          ↓
     Log error
          ↓
     Show friendly message
          ↓
     Retry button
```

Never leave the user on an infinite loading screen.

Every asynchronous operation needs:

```text
Loading
Success
Error
Empty
```

states.

---

# 11. Development Workflow

## Phase 1 — Foundation

Build:

- Repository
- Frontend
- Backend
- Environment configuration
- Git configuration
- README

Verify:

```text
Frontend starts
Backend starts
Health endpoint works
```

---

## Phase 2 — Authentication

Build:

- Register
- Login
- Logout
- Protected routes

Verify:

```text
Register → Login → Dashboard
```

---

## Phase 3 — Session System

Build:

- Session creation
- Session list
- Session status
- Session details

Verify database operations.

---

## Phase 4 — Agora

Build only the minimum Agora integration first.

Test:

```text
Browser
   ↓
Agora
   ↓
Voice connection
```

Do not proceed until the voice connection is stable.

---

## Phase 5 — Conversation AI

Connect Conversation AI.

Test:

```text
User speaks
      ↓
AI understands
      ↓
AI responds
```

Do not build evaluation yet.

---

## Phase 6 — Evaluation

Once voice interaction is stable:

- Save required session information.
- Implement evaluator.
- Validate structured output.
- Generate report.

---

## Phase 7 — Dashboard

Add:

- Statistics
- History
- Reports
- Progress

---

## Phase 8 — Polish

Improve:

- UI
- Loading states
- Error handling
- Responsive design
- Accessibility
- Empty states

---

## Phase 9 — Testing

Run:

```text
Frontend build
Backend tests
API tests
Manual Agora test
End-to-end session
```

---

## Phase 10 — Deployment

Deploy backend first.

Verify:

```text
Health
Authentication
Database
Agora
Evaluation
```

Then deploy frontend.

Finally perform a complete production test.

---

# 12. Definition of Done

A feature is NOT complete simply because the code compiles.

A feature is complete when:

```text
Code
 +
Validation
 +
Error handling
 +
Loading state
 +
Testing
 +
Documentation
```

are all present.