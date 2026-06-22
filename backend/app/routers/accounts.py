from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Account, Customer, AccountAudit
from ..schemas import AccountCreate, AccountUpdate, AccountOut, TokenData, DepositWithdraw, Transfer
from ..dependencies import require_roles, get_current_user

router = APIRouter(tags=["Accounts"])

def verify_account_ownership(current_user: TokenData, account: Account):
    if current_user.role != "Admin" and current_user.cust_id != account.Custid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied. You do not have permission to view or manage this account."
        )

@router.get("/")
def get_all_accounts(
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(get_current_user)
):
    if current_user.role == "Admin":
        accounts = db.query(Account).all()
    else:
        accounts = db.query(Account).filter(Account.Custid == current_user.cust_id).all()
        
    return {
        "success": True,
        "message": "Accounts retrieved successfully.",
        "data": accounts
    }

@router.get("/{accountNo}")
def get_account_by_no(
    accountNo: str, 
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(get_current_user)
):
    account = db.query(Account).filter(Account.Account_No == accountNo).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account {accountNo} not found."
        )
    verify_account_ownership(current_user, account)
    return {
        "success": True,
        "message": "Account details retrieved successfully.",
        "data": account
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate, 
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(get_current_user)
):
    # Verify profile ownership if Customer is creating
    if current_user.role != "Admin" and current_user.cust_id != payload.Custid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied. You can only create bank accounts for your own profile."
        )

    # Verify customer exists
    customer = db.query(Customer).filter(Customer.Custid == payload.Custid).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {payload.Custid} does not exist."
        )

    # Check for duplicate account number
    existing_account = db.query(Account).filter(Account.Account_No == payload.Account_No).first()
    if existing_account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account number {payload.Account_No} already exists."
        )

    new_account = Account(
        Account_No=payload.Account_No,
        Acc_Type=payload.Acc_Type,
        Balance=payload.Balance,
        Custid=payload.Custid
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return {
        "success": True,
        "message": "Account created successfully.",
        "data": new_account
    }

@router.put("/{accountNo}")
def update_account(
    accountNo: str, 
    payload: AccountUpdate, 
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(require_roles("Admin"))
):
    account = db.query(Account).filter(Account.Account_No == accountNo).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account {accountNo} not found."
        )

    # If updating customer, verify customer exists
    if payload.Custid:
        customer = db.query(Customer).filter(Customer.Custid == payload.Custid).first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {payload.Custid} does not exist."
            )

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(account, key, value)

    db.commit()
    db.refresh(account)
    return {
        "success": True,
        "message": "Account updated successfully.",
        "data": account
    }

@router.delete("/{accountNo}")
def delete_account(
    accountNo: str, 
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(require_roles("Admin"))
):
    account = db.query(Account).filter(Account.Account_No == accountNo).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account {accountNo} not found."
        )
    db.delete(account)
    db.commit()
    return {"success": True, "message": f"Account {accountNo} successfully deleted."}

@router.get("/audit-logs/all")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_roles("Admin"))
):
    audits = db.query(AccountAudit).order_by(AccountAudit.Audit_ID.desc()).all()
    return {
        "success": True,
        "message": "Audit logs retrieved successfully.",
        "data": audits
    }

@router.post("/deposit")
def deposit(payload: DepositWithdraw, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    try:
        account = db.query(Account).filter(Account.Account_No == payload.accountNo).with_for_update().first()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Account {payload.accountNo} not found."
            )
        verify_account_ownership(current_user, account)
        old_balance = account.Balance
        new_balance = old_balance + payload.amount
        account.Balance = new_balance
        db.commit()
        db.refresh(account)
        return {
            "success": True,
            "message": "Deposit processed successfully.",
            "data": {
                "accountNo": account.Account_No,
                "transactionType": "DEPOSIT",
                "amount": payload.amount,
                "oldBalance": old_balance,
                "newBalance": new_balance
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transaction failed: {str(e)}"
        )

@router.post("/withdraw")
def withdraw(payload: DepositWithdraw, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    try:
        account = db.query(Account).filter(Account.Account_No == payload.accountNo).with_for_update().first()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Account {payload.accountNo} not found."
            )
        verify_account_ownership(current_user, account)
        old_balance = account.Balance
        if old_balance < payload.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient funds. Available balance is {old_balance:.2f}."
            )
        new_balance = old_balance - payload.amount
        account.Balance = new_balance
        db.commit()
        db.refresh(account)
        return {
            "success": True,
            "message": "Withdrawal processed successfully.",
            "data": {
                "accountNo": account.Account_No,
                "transactionType": "WITHDRAWAL",
                "amount": payload.amount,
                "oldBalance": old_balance,
                "newBalance": new_balance
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transaction failed: {str(e)}"
        )

@router.post("/transfer")
def transfer(payload: Transfer, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    try:
        first_acc_no = min(payload.fromAccount, payload.toAccount)
        second_acc_no = max(payload.fromAccount, payload.toAccount)
        first_acc = db.query(Account).filter(Account.Account_No == first_acc_no).with_for_update().first()
        second_acc = db.query(Account).filter(Account.Account_No == second_acc_no).with_for_update().first()
        source_account = first_acc if payload.fromAccount == first_acc_no else second_acc
        dest_account = second_acc if payload.fromAccount == first_acc_no else first_acc
        if not source_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source account {payload.fromAccount} not found."
            )
        if not dest_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Destination account {payload.toAccount} not found."
            )
        verify_account_ownership(current_user, source_account)
        old_source_balance = source_account.Balance
        if old_source_balance < payload.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient funds. Source account balance is {old_source_balance:.2f}."
            )
        old_dest_balance = dest_account.Balance
        source_account.Balance = old_source_balance - payload.amount
        dest_account.Balance = old_dest_balance + payload.amount
        db.commit()
        return {
            "success": True,
            "message": "Transfer processed successfully.",
            "data": {
                "transactionType": "TRANSFER",
                "amount": payload.amount,
                "source": {
                    "accountNo": source_account.Account_No,
                    "oldBalance": old_source_balance,
                    "newBalance": source_account.Balance
                },
                "destination": {
                    "accountNo": dest_account.Account_No,
                    "oldBalance": old_dest_balance,
                    "newBalance": dest_account.Balance
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fund transfer failed: {str(e)}"
        )

Post_Out = AccountOut
