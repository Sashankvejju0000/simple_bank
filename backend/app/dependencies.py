from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from .config import settings
from .schemas import TokenData

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    token = credentials.credentials
    # Strip duplicate "Bearer " if accidentally prepended in test inputs
    if token.startswith("Bearer "):
        token = token[7:]
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate token. Please login again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: int = payload.get("id")
        email: str = payload.get("email")
        role: str = payload.get("role")
        cust_id: str = payload.get("cust_id")
        if email is None or role is None:
            raise credentials_exception
        return TokenData(id=user_id, email=email, role=role, cust_id=cust_id)
    except JWTError:
        raise credentials_exception

def require_roles(*allowed_roles: str):
    def role_dependency(current_user: TokenData = Depends(get_current_user)) -> TokenData:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied. You do not have permissions for this action."
            )
        return current_user
    return role_dependency
