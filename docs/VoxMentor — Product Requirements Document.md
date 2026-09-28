# VoxMentor
## Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Hackathon MVP  
**Platform:** Web + Backend  
**Primary Technology:** Agora Conversation AI

---

## 1. Product Overview

VoxMentor is a real-time AI voice career mentor designed for students and early-career professionals.

Users can interact with an AI mentor through natural voice conversations instead of typing. The AI can conduct mock interviews, act as a learning mentor, and provide communication practice.

After a session, VoxMentor generates a structured performance report containing scores, strengths, weaknesses, and actionable recommendations.

The primary differentiator is adaptive real-time voice interaction powered by Agora Conversation AI.

---

## 2. Problem Statement

Students and job seekers often prepare for interviews by:

- Reading interview questions
- Watching videos
- Practicing alone
- Typing questions into AI tools

These approaches lack realistic two-way conversation.

Users need a system that can:

1. Listen to their spoken answers.
2. Respond naturally.
3. Ask relevant follow-up questions.
4. Adapt difficulty based on their performance.
5. Evaluate the session.
6. Provide actionable improvement guidance.

---

## 3. Proposed Solution

VoxMentor provides an AI-powered voice mentor accessible through a web browser.

A user selects a session type, starts a voice conversation, and interacts with the AI in real time.

The AI dynamically controls the conversation according to the selected mode.

At the end of the session, the system generates a performance report.

---

## 4. Target Users

### Primary Users

- College students
- Job seekers
- Developers
- Recent graduates
- Professionals preparing for interviews

### Secondary Users

- Students improving communication skills
- Learners wanting conversational tutoring

---

## 5. MVP Goals

The MVP must successfully support:

1. User authentication.
2. Dashboard.
3. Mentor/session selection.
4. Real-time Agora voice session.
5. AI conversational interaction.
6. Adaptive questioning.
7. Session termination.
8. AI-generated evaluation.
9. Performance report.
10. Session history.

---

# 6. Core Features

## 6.1 Authentication

Users can:

- Register
- Login
- Logout
- Access protected pages

Authentication should use secure token-based authentication.

---

## 6.2 Dashboard

The dashboard displays:

- Welcome message
- Start New Session
- Recent sessions
- Average score
- Number of completed sessions
- Improvement overview

Example:

```text
Welcome back!

Start a Session

[ Technical Interview ]
[ HR Interview ]
[ Learning Mentor ]
[ Communication Coach ]

Recent Sessions
-------------------------
Python Interview     82%
HR Interview         76%
Communication        88%
```

---

## 6.3 Session Configuration

Before starting a session, the user selects:

### Mode

- Technical Interview
- HR Interview
- Learning Mentor
- Communication Coach

### Optional configuration

- Topic
- Difficulty
- Session duration

For MVP, keep configuration simple.

Recommended defaults:

```text
Mode: Technical Interview
Topic: General
Difficulty: Intermediate
Duration: 10 minutes
```

---

# 7. Real-Time Voice Session

This is the most important feature.

The user clicks:

**Start Session**

The application:

1. Creates a session.
2. Requests required Agora credentials/token from backend.
3. Connects to Agora.
4. Starts the Conversation AI interaction.
5. AI greets the user.
6. User speaks.
7. AI responds.
8. Conversation continues naturally.

The UI should display:

```text
┌─────────────────────────────┐
│        VoxMentor            │
│                             │
│      AI Mentor Active       │
│                             │
│          🎙️                 │
│                             │
│    "Tell me about yourself" │
│                             │
│   [ Mute ]   [ End Session ]│
└─────────────────────────────┘
```

---

# 8. Adaptive Conversation

The AI should not simply follow a fixed question list.

The system should provide the AI with:

- Selected mode
- Topic
- Difficulty
- Conversation history
- Session objective

The AI should:

- Ask an appropriate question.
- Understand the response.
- Ask follow-up questions.
- Increase difficulty when appropriate.
- Simplify questions when the user struggles.
- Avoid repeating questions.
- Stay within the selected topic.

Example:

```text
AI:
Explain REST APIs.

User:
Answers correctly.

AI:
Good. Now let's discuss authentication in REST APIs.
```

---

# 9. Session Evaluation

After the session ends, the backend sends the relevant conversation data to the evaluation system.

The evaluator generates structured results.

### Evaluation dimensions

Technical Interview:

- Technical Knowledge
- Answer Relevance
- Problem Solving
- Communication
- Confidence
- Overall Score

HR Interview:

- Communication
- Clarity
- Relevance
- Confidence
- Professionalism
- Overall Score

Communication Coach:

- Clarity
- Fluency
- Structure
- Conciseness
- Overall Score

Learning Mentor:

- Understanding
- Reasoning
- Engagement
- Concept Accuracy
- Overall Score

---

# 10. Performance Report

Example:

```text
SESSION REPORT

Overall Score
82 / 100

Technical Knowledge       86
Communication             79
Answer Relevance          88
Confidence                75

Strengths
✓ Good technical fundamentals
✓ Relevant examples
✓ Clear explanations

Areas to Improve
• Explain concepts more concisely
• Improve confidence
• Practice system design

Recommended Practice

1. REST API Design
2. Authentication
3. System Design Basics
```

---

# 11. Session History

Users can view previous sessions.

Each session stores:

- Mode
- Topic
- Date
- Duration
- Score
- Summary

Users can open a session to see the performance report.

---

# 12. Progress Tracking

The dashboard should show simple progress information.

Example:

```text
Performance

Session 1     64
Session 2     70
Session 3     76
Session 4     82
Session 5     87
```

Do not build an overly complicated analytics system for the MVP.

---

# 13. Technical Requirements

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Agora Web SDK
- Recharts

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- JWT authentication

## Optional Infrastructure

- Redis
- Docker

Redis should not be mandatory for the first MVP.

---

# 14. Non-Functional Requirements

The application should be:

### Reliable

No crashes during normal usage.

### Secure

- Never expose API secrets in frontend code.
- Validate backend requests.
- Protect authenticated endpoints.
- Use environment variables.

### Maintainable

Use clear separation between:

```text
UI
API
Business Logic
Database
Agora Integration
AI Evaluation
```

### Simple

Avoid unnecessary microservices.

Use one frontend and one FastAPI backend.

---

# 15. Out of Scope for MVP

Do NOT implement initially:

- Mobile applications
- Video calling
- Complex emotion detection
- Facial analysis
- Payment system
- Social networking
- Multi-language support
- Complex recommendation engine
- Custom ML model training
- Microservice architecture
- Real-time multiplayer functionality

These can be future enhancements.

---

# 16. Success Criteria

The MVP is considered successful when:

1. A user can register/login.
2. User can select an interview mode.
3. User can start an Agora voice session.
4. User can talk naturally with the AI.
5. AI responds appropriately.
6. Conversation ends safely.
7. Session evaluation is generated.
8. User receives a performance report.
9. Session appears in history.
10. Application can be demonstrated reliably without manual database manipulation.

---

# 17. Hackathon Differentiator

VoxMentor is not simply a chatbot with speech input.

The core experience is:

```text
REAL-TIME VOICE
       +
CONTEXTUAL CONVERSATION
       +
ADAPTIVE QUESTIONING
       +
AI EVALUATION
       +
PROGRESS TRACKING
```

Agora Conversation AI is therefore a core component of the product rather than an optional integration.

---

# 18. Future Roadmap

After the MVP:

### Phase 2

- Resume-based interview
- Job-role-specific interviews
- Personalized learning plans
- More detailed analytics

### Phase 3

- Voice personality selection
- Multi-language support
- Interview difficulty adaptation
- Long-term AI mentor memory
- Recruiter mode
- Team/institution dashboard