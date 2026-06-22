from sqlalchemy import Column, Integer, String, Numeric, Enum, ForeignKey, TIMESTAMP, func
from .database import Base

class Customer(Base):
    __tablename__ = "customer"

    Custid = Column(String(10), primary_key=True)
    Name = Column(String(50), nullable=True)
    Mobile_No = Column(String(15), nullable=True)
    Address = Column(String(100), nullable=True)
    Email = Column(String(50), nullable=True)

class Account(Base):
    __tablename__ = "account"

    Account_No = Column(String(10), primary_key=True)
    Acc_Type = Column(String(20), nullable=True)
    Balance = Column(Numeric(10, 2), nullable=True, default=0.00)
    Custid = Column(String(10), ForeignKey("customer.Custid", ondelete="CASCADE"), nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(Enum("Admin", "Customer", name="user_role"), default="Customer", nullable=False)
    cust_id = Column(String(20), ForeignKey("customer.Custid", ondelete="CASCADE"), unique=True, nullable=True)

class AccountAudit(Base):
    __tablename__ = "account_audit"

    Audit_ID = Column(Integer, primary_key=True, autoincrement=True)
    Account_No = Column(String(10), nullable=True)
    Old_Balance = Column(Numeric(10, 2), nullable=True)
    New_Balance = Column(Numeric(10, 2), nullable=True)
    Change_Date = Column(TIMESTAMP, server_default=func.now(), nullable=True)
