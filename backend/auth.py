from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db, User
from config import settings
import logging

logger = logging.getLogger(__name__)

# Password hashing
# Use bcrypt_sha256 to avoid bcrypt's 72-byte limit (it hashes with SHA256 first).
# Keep bcrypt as a secondary scheme for compatibility. Provide a pbkdf2 fallback
# in case bcrypt backends are not available or raise unexpected errors.
pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")
# Fallback context for environments that lack a working bcrypt backend
_pbkdf2_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.exception("Error verifying password with primary context, attempting pbkdf2 fallback")
        try:
            return _pbkdf2_context.verify(plain_password, hashed_password)
        except Exception:
            return False


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    try:
        return pwd_context.hash(password)
    except ValueError as ve:
        # Common case: bcrypt rejects >72 bytes. Try pbkdf2 fallback.
        logger.warning("Password hashing with bcrypt failed: %s. Falling back to pbkdf2_sha256.", ve)
        try:
            return _pbkdf2_context.hash(password)
        except Exception as e:
            logger.exception("Fallback pbkdf2 hashing also failed")
            raise
    except Exception as e:
        # Unexpected errors (e.g. backend detection issues). Try pbkdf2 fallback then re-raise.
        logger.exception("Unexpected error during password hashing, attempting fallback: %s", e)
        try:
            return _pbkdf2_context.hash(password)
        except Exception:
            raise


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return username."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if username is None:
            return None
        return username
    except JWTError:
        return None


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate user with username and password."""
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    username = verify_token(credentials.credentials)
    if username is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current user if admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user