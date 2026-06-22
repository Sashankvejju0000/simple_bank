import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Customer
from ..schemas import UserRegister, UserLogin, LoginResponse, UserOut
from ..auth import get_password_hash, verify_password, create_access_token

router = APIRouter(tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # 1. Check if user already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists."
        )

    # 2. Generate a unique varchar(10) customer ID
    cust_id = "CUST" + uuid.uuid4().hex[:6].upper()

    try:
        # We wrap this in a transaction block
        new_customer = Customer(
            Custid=cust_id,
            Name=payload.name,
            Mobile_No=payload.Mobile_No,
            Address=payload.address,
            Email=payload.email
        )
        db.add(new_customer)
        db.flush() 

        # Hash password and create user
        hashed_password = get_password_hash(payload.password)
        new_user = User(
            email=payload.email,
            password=hashed_password,
            role="Customer",
            cust_id=cust_id
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {
            "success": True,
            "message": "Customer registered successfully.",
            "data": {
                "id": new_user.id,
                "email": new_user.email,
                "role": new_user.role,
                "cust_id": new_user.cust_id
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Sign JWT token
    token_data = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "cust_id": user.cust_id
    }
    token = create_access_token(token_data)

    return {
        "success": True,
        "message": "Login successful.",
        "data": {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "cust_id": user.cust_id
            }
        }
    }
