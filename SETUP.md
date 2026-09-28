# VoxMentor Setup Guide

This guide covers everything you need to run VoxMentor locally.

## 1. Database Setup

1. Install PostgreSQL.
2. Create a local database named `voxmentor`.
3. Create a `.env` file in the `backend/` directory based on `backend/.env.example`.
4. Update `DATABASE_URL` with your credentials:
   `DATABASE_URL=postgresql://username:password@localhost:5432/voxmentor`

## 2. API Keys & Services

### Agora Conversation AI
1. Create a project in the Agora Console.
2. Obtain your App ID and App Certificate.
3. Enable Conversation AI and create a Pipeline.
4. Add these to `backend/.env`.
5. Add the App ID to `frontend/.env`.

### LLM Provider (Evaluation)
1. Get an API key from your preferred provider (e.g., Groq, OpenAI).
2. Set `AI_PROVIDER`, `AI_MODEL`, and `AI_API_KEY` in `backend/.env`.

### Google OAuth (Optional)
1. Set up a project in Google Cloud Console.
2. Create OAuth 2.0 Client IDs.
3. Set the redirect URI to `http://localhost:8000/api/v1/auth/google/callback`.
4. Add the credentials to `backend/.env`.

## 3. Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Initialize database schema
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```
The backend will run on `http://localhost:8000`. 
API Docs: `http://localhost:8000/docs`

## 4. Frontend Setup

```powershell
cd frontend
npm install

# Create .env based on .env.example
# Start development server
npm run dev
```
The frontend will run on `http://localhost:5173`.

## 5. Security Reminder

- **NEVER** put your `AGORA_APP_CERTIFICATE`, `JWT_SECRET`, or `GOOGLE_CLIENT_SECRET` in `frontend/.env`.
- Frontend `.env` variables (`VITE_AGORA_APP_ID`) are public to the browser.
