from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from decimal import Decimal
from typing import Optional, List

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None
    cust_id: Optional[str] = None

# Customer Profile Schemas
class CustomerBase(BaseModel):
    Name: str = Field(..., max_length=50)
    Mobile_No: str = Field(..., max_length=15)
    Address: str = Field(..., max_length=100)
    Email: Optional[EmailStr] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    Name: Optional[str] = Field(None, max_length=50)
    Mobile_No: Optional[str] = Field(None, max_length=15)
    Address: Optional[str] = Field(None, max_length=100)
    Email: Optional[EmailStr] = None

class CustomerOut(CustomerBase):
    Custid: str
    class Config:
        from_attributes = True

# Auth Registration & Login Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., max_length=50)
    Mobile_No: str = Field(..., max_length=15)
    address: str = Field(..., max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    cust_id: Optional[str] = None
    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    token: str
    user: UserOut

# Account Management Schemas
class AccountBase(BaseModel):
    Account_No: str = Field(..., max_length=10)
    Acc_Type: str = Field(..., max_length=20)
    Balance: Decimal = Field(default=Decimal("0.00"), ge=0)

    @field_validator("Acc_Type")
    @classmethod
    def validate_acc_type(cls, v: str) -> str:
        if v not in ["Savings", "Checking", "Current"]:
            raise ValueError("Acc_Type must be 'Savings', 'Checking', or 'Current'")
        return v

class AccountCreate(AccountBase):
    Custid: str = Field(..., max_length=10)

class AccountUpdate(BaseModel):
    Acc_Type: Optional[str] = Field(None, max_length=20)
    Balance: Optional[Decimal] = Field(None, ge=0)
    Custid: Optional[str] = Field(None, max_length=10)

    @field_validator("Acc_Type")
    @classmethod
    def validate_acc_type_opt(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ["Savings", "Checking", "Current"]:
            raise ValueError("Acc_Type must be 'Savings', 'Checking', or 'Current'")
        return v

class AccountOut(AccountBase):
    Custid: Optional[str] = None
    class Config:
        from_attributes = True

# Transaction Execution Schemas
class DepositWithdraw(BaseModel):
    accountNo: str = Field(..., max_length=10)
    amount: Decimal = Field(..., gt=0)

class Transfer(BaseModel):
    fromAccount: str = Field(..., max_length=10)
    toAccount: str = Field(..., max_length=10)
    amount: Decimal = Field(..., gt=0)

    @model_validator(mode="after")
    def validate_different_accounts(self):
        if self.fromAccount == self.toAccount:
            raise ValueError("Source and destination accounts must be different.")
        return self
