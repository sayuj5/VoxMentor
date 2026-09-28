# Contributing to VoxMentor

First off, thank you for considering contributing to VoxMentor! It's people like you that make open-source a great community.

## Getting Started

1. Fork the repository and clone it locally.
2. Follow the [SETUP.md](SETUP.md) guide to configure your local development environment.
3. Ensure you have the `.env` templates properly duplicated and configured.

## Branching Model

Please use the following convention for branch names:
- `feat/feature-name` for new features
- `fix/bug-name` for bug fixes
- `docs/doc-name` for documentation updates

## Pull Requests

1. Keep your PRs focused on a single change.
2. Before submitting, run the backend tests (`pytest`) and frontend build (`npm run build`).
3. Ensure no secrets (e.g., API keys, `.env` files) are included in your commits. The `.gitignore` is strictly configured to prevent this, but manual checks are always appreciated.
4. Add documentation for any newly added API routes or UI components.

## Code Quality

- **Backend**: We use FastAPI with strict Pydantic types. Please ensure all new endpoints have accurate type hints.
- **Frontend**: We use TypeScript and Tailwind CSS. Avoid raw CSS unless necessary, and rely on `cn()` (clsx + tailwind-merge) for dynamic class strings.
