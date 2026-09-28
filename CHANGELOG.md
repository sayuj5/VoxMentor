# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **Core Platform**: Complete end-to-end flow from account creation to real-time voice practice and reporting.
- **Agora Integration**: Seamless real-time voice integration using Agora Conversation AI.
- **Practice Modes**: Technical Interview, HR Interview, Learning Mentor, and Communication Coach modes configured via pipeline properties.
- **AI Evaluation System**: Automatic post-session transcription, LLM-based analysis, and structured PostgreSQL persistence of scores/recommendations.
- **Authentication**: JWT-based Email/Password authentication.
- **Google OAuth**: Integrated secure OAuth 2.0 flow with HttpOnly state cookies.
- **Dashboard & History**: User-centric tracking of past sessions, average scores, and improvements over time.
- **Premium UI**: Dark-themed Tailwind CSS design system with Framer Motion animations and Three.js hero elements (PrismHero).
- **Responsive Navigation & Footer**: Custom animated HoverFooter with tailored links and brand identity.
- **Documentation**: Comprehensive README, ARCHITECTURE, SETUP, and SECURITY guides.

### Fixed
- Fixed Alembic migration constraints (NotNullViolation) by establishing a `server_default` for new non-nullable columns.
- Resolved PostgreSQL database `users` schema alignment issues by safely linking existing password users to Google OAuth accounts.
- Fixed React hydration and type issues related to unused icon imports and generic button parameters.
