# Security Policy

## Supported Versions

Currently, VoxMentor is in active development. Only the latest commit on `main` is actively supported for security patches.

## Secret Management

VoxMentor strictly enforces the separation of frontend public credentials from backend-only secrets.

**Backend (.env)**
- `DATABASE_URL`
- `JWT_SECRET`
- `AGORA_APP_CERTIFICATE`
- `AGORA_CONVERSATION_API_CREDENTIAL`
- `GOOGLE_CLIENT_SECRET`
- `AI_API_KEY`

**Frontend (.env)**
- `VITE_API_BASE_URL`
- `VITE_AGORA_APP_ID`

*Under no circumstances should backend secrets be prefixed with `VITE_` or committed to source control.*

## Security Features Implemented

- **Password Hashing**: Passwords are cryptographically hashed using `bcrypt` (via `passlib`) before database persistence.
- **JWT Sessions**: Session state is managed via secure, time-expiring JWT tokens.
- **Google OAuth**: Integrates securely with HttpOnly, SameSite cookie state validation to prevent CSRF attacks during the OAuth callback.
- **CORS**: Enforced at the API level restricting requests to trusted frontend origins.
- **SQL Injection Prevention**: Enforced universally by relying on SQLAlchemy ORM for parameterized queries.

## Reporting a Vulnerability

If you discover a security vulnerability within VoxMentor, please do NOT report it via public GitHub issues. Instead, contact the repository owner directly.
