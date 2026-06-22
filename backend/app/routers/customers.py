import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Customer
from ..schemas import CustomerCreate, CustomerUpdate, CustomerOut, TokenData
from ..dependencies import require_roles, get_current_user

router = APIRouter(tags=["Customers"])

def check_profile_access(current_user: TokenData, cust_id: str):
    if current_user.role != "Admin" and current_user.cust_id != cust_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied. You do not have permission to view or edit this profile."
        )

@router.get("/")
def get_all_customers(
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(require_roles("Admin"))
):
    customers = db.query(Customer).all()
    return {
        "success": True,
        "message": "Customers retrieved successfully.",
        "data": customers
    }

@router.get("/{id}")
def get_customer_by_id(
    id: str, 
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(get_current_user)
):
    check_profile_access(current_user, id)
    customer = db.query(Customer).filter(Customer.Custid == id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {id} not found."
        )
    return {
        "success": True,
        "message": "Customer profile retrieved successfully.",
        "data": customer
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_customer_profile(
    payload: CustomerCreate, 
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(require_roles("Admin"))
):
    cust_id = "CUST" + uuid.uuid4().hex[:6].upper()
    new_customer = Customer(
        Custid=cust_id,
        Name=payload.Name,
        Mobile_No=payload.Mobile_No,
        Address=payload.Address,
        Email=payload.Email
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return {
        "success": True,
        "message": "Customer profile created successfully.",
        "data": new_customer
    }

@router.put("/{id}")
def update_customer_profile(
    id: str, 
    payload: CustomerUpdate, 
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(get_current_user)
):
    check_profile_access(current_user, id)
    customer = db.query(Customer).filter(Customer.Custid == id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {id} not found."
        )

    # Update only provided fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)
    
    db.commit()
    db.refresh(customer)
    return {
        "success": True,
        "message": "Customer profile updated successfully.",
        "data": customer
    }

@router.delete("/{id}")
def delete_customer_profile(
    id: str, 
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(require_roles("Admin"))
):
    customer = db.query(Customer).filter(Customer.Custid == id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {id} not found."
        )
    db.delete(customer)
    db.commit()
    return {"success": True, "message": f"Customer {id} successfully deleted."}
