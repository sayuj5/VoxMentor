from datetime import timedelta
import secrets
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session as DbSession
from app.db.database import get_db
from app.models.models import User
from app.schemas.schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.api.deps import get_current_user
from app.core.logging import logger

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"New user registered: {user.email}")

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Ensure they have a password hash (might be Google-only user)
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        logger.warning(f"Failed login attempt for email: {payload.email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/google")
def google_auth():
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")
    
    state = secrets.token_urlsafe(32)
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        f"scope=openid%20email%20profile&"
        f"state={state}"
    )
    
    response = RedirectResponse(url=google_auth_url)
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        max_age=600,
        secure=False,
        samesite="lax"
    )
    return response


@router.get("/google/callback")
def google_auth_callback(request: Request, code: str = None, state: str = None, error: str = None, db: DbSession = Depends(get_db)):
    if error:
        logger.error(f"Google auth error: {error}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=google_auth_failed")
    
    saved_state = request.cookies.get("oauth_state")
    if not saved_state or saved_state != state:
        logger.error("OAuth state mismatch or missing")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=invalid_state")
        
    if not code:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=missing_code")
        
    token_data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
    }
    
    try:
        with httpx.Client() as client:
            token_res = client.post("https://oauth2.googleapis.com/token", data=token_data)
            token_res.raise_for_status()
            access_token = token_res.json()["access_token"]
            
            user_info_res = client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_info_res.raise_for_status()
            user_info = user_info_res.json()
            
            email = user_info.get("email")
            name = user_info.get("name")
            google_id = user_info.get("sub")
            
            if not email:
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=no_email")
                
            user = db.query(User).filter((User.email == email) | (User.google_id == google_id)).first()
            if not user:
                user = User(
                    email=email,
                    name=name,
                    google_id=google_id,
                    password_hash=None
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            elif not user.google_id:
                user.google_id = google_id
                db.commit()
                
            jwt_token = create_access_token(
                data={"sub": str(user.id)},
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            )
            
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?token={jwt_token}")
            
    except httpx.HTTPStatusError as e:
        logger.error(f"Google OAuth HTTP error: {e.response.text}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=google_auth_failed")
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=internal_error")
