# Engineering Rules and Development Conventions

1. **Absolute Development Principle**: Build a reliable MVP. Do NOT over-engineer. Use a modular monolith. Prefer the simplest reliable solution.
2. **Project Structure**:
    - Frontend: `frontend/` (React + TypeScript + Vite)
    - Backend: `backend/` (Python + FastAPI)
3. **Database**: PostgreSQL with SQLAlchemy.
4. **Environment Variables**:
    - Never expose server-side secrets.
    - Never commit `.env`.
    - Frontend should only receive values that are safe for the browser.
5. **Agora**:
    - Agora Conversation AI is a core requirement.
    - Do not guess Agora APIs.
    - Isolate Agora-specific logic inside its service layer.
    - Backend must handle sensitive credential/token generation.
6. **Code Quality**:
    - Use strict TypeScript and Python type hints.
    - Use Pydantic schemas.
    - Small functions, reusable components, service abstraction.
    - Centralized API client and error handling.
    - Avoid giant components, duplicate logic, unused dependencies, hard-coded values.
7. **Change Management**:
    - Do not rewrite working modules unnecessarily.
    - Make the smallest safe change.
    - Run affected tests and verify existing functionality.
8. **Dependencies**:
    - Ask: "Can this requirement be implemented reliably with the existing stack?" before adding new dependencies.
    - Use stable packages and compatible versions.
9. **Error Handling**:
    - Use consistent error responses.
    - Never expose stack traces, database errors, API keys, or internal exceptions to users.
10. **Final Rule**: Optimize for WORKING PRODUCT, RELIABLE AGORA INTEGRATION, CLEAN UX, SECURITY, LOW BUG COUNT, STRONG DEMO. When uncertain, choose the simplest reliable solution.
