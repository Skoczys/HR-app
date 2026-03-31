from datetime import date
import calendar
import os
import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import SessionLocal, engine, Base
from models.user import User
from models.leave_request import LeaveRequest, LeaveBalance
from models.employee_document import EmployeeDocument
from schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserPasswordReset,
    ChangeOwnPassword,
)
from schemas.leave_request import (
    LeaveRequestCreate,
    LeaveRequestResponse,
    LeaveRequestDecision,
    LeaveBalanceCreate,
    LeaveBalanceUpdate,
    LeaveBalanceResponse,
)
from schemas.employee_document import EmployeeDocumentResponse
from security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------
# STAŁE
# -----------------------

ALLOWED_LEAVE_TYPES = [
    "wypoczynkowy",
    "na_zadanie",
    "chorobowe",
    "okolicznosciowy",
    "bezplatny",
]

DOCUMENT_TYPES = [
    "umowa",
    "aneks",
    "pit",
    "badania",
    "bhp",
    "ppk",
    "inne",
]

UPLOAD_ROOT = Path("uploads")
EMPLOYEE_DOCUMENTS_DIR = UPLOAD_ROOT / "employee-documents"
EMPLOYEE_DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)


# -----------------------
# BAZA DANYCH
# -----------------------

Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------
# HELPERY OGÓLNE
# -----------------------

def calculate_leave_days(start_date, end_date):
    return (end_date - start_date).days + 1


def build_full_name(user: User | None):
    if not user:
        return None
    return f"{user.first_name} {user.last_name}"


def calculate_base_leave_limit(leave_seniority_years: int) -> int:
    if leave_seniority_years >= 10:
        return 26
    return 20


def create_initial_leave_balance_for_user(
    user_id: int,
    leave_seniority_years: int,
    db: Session,
):
    current_year = date.today().year

    existing_balance = db.query(LeaveBalance).filter(
        LeaveBalance.user_id == user_id,
        LeaveBalance.year == current_year,
    ).first()

    if existing_balance:
        return

    base_limit_days = calculate_base_leave_limit(leave_seniority_years)

    balance = LeaveBalance(
        user_id=user_id,
        year=current_year,
        base_limit_days=base_limit_days,
        carried_over_days=0,
        used_days=0,
        on_demand_used_days=0,
    )

    db.add(balance)


def is_leave_active_on_day(leave: LeaveRequest, target_day: date) -> bool:
    return leave.start_date <= target_day <= leave.end_date


# -----------------------
# HELPERY LEAVE REQUESTS
# -----------------------

def build_leave_response(leave: LeaveRequest, db: Session) -> LeaveRequestResponse:
    employee = db.query(User).filter(User.id == leave.user_id).first()
    manager = db.query(User).filter(User.id == leave.manager_id).first() if leave.manager_id else None
    substitute = db.query(User).filter(User.id == leave.substitute_id).first() if leave.substitute_id else None
    decided_by = db.query(User).filter(User.id == leave.decided_by_user_id).first() if leave.decided_by_user_id else None

    return LeaveRequestResponse(
        id=leave.id,
        user_id=leave.user_id,
        manager_id=leave.manager_id,
        substitute_id=leave.substitute_id,
        start_date=leave.start_date,
        end_date=leave.end_date,
        leave_type=leave.leave_type,
        status=leave.status,
        notes=leave.notes,
        total_days=calculate_leave_days(leave.start_date, leave.end_date),
        decision_comment=leave.decision_comment,
        decided_by_user_id=leave.decided_by_user_id,
        decision_date=leave.decision_date,
        employee_name=build_full_name(employee),
        employee_department=employee.department if employee else None,
        employee_job_title=employee.job_title if employee else None,
        manager_name=build_full_name(manager),
        substitute_name=build_full_name(substitute),
        decided_by_name=build_full_name(decided_by),
    )


def build_leave_details_response(leave: LeaveRequest, db: Session):
    employee = db.query(User).filter(User.id == leave.user_id).first()
    manager = db.query(User).filter(User.id == leave.manager_id).first() if leave.manager_id else None
    substitute = db.query(User).filter(User.id == leave.substitute_id).first() if leave.substitute_id else None
    decided_by = db.query(User).filter(User.id == leave.decided_by_user_id).first() if leave.decided_by_user_id else None

    return {
        "id": leave.id,
        "user_id": leave.user_id,
        "manager_id": leave.manager_id,
        "substitute_id": leave.substitute_id,
        "status": leave.status,
        "leave_type": leave.leave_type,
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "total_days": calculate_leave_days(leave.start_date, leave.end_date),
        "notes": leave.notes,
        "decision_comment": leave.decision_comment,
        "decided_by_user_id": leave.decided_by_user_id,
        "decision_date": leave.decision_date,
        "employee_name": build_full_name(employee),
        "employee_department": employee.department if employee else None,
        "employee_job_title": employee.job_title if employee else None,
        "manager_name": build_full_name(manager),
        "substitute_name": build_full_name(substitute),
        "decided_by_name": build_full_name(decided_by),
    }


def build_leave_balance_response(balance: LeaveBalance, db: Session) -> LeaveBalanceResponse:
    employee = db.query(User).filter(User.id == balance.user_id).first()

    total_available_days = balance.base_limit_days + balance.carried_over_days
    remaining_days = total_available_days - balance.used_days
    remaining_on_demand_days = 4 - balance.on_demand_used_days

    if remaining_days < 0:
        remaining_days = 0

    if remaining_on_demand_days < 0:
        remaining_on_demand_days = 0

    return LeaveBalanceResponse(
        id=balance.id,
        user_id=balance.user_id,
        year=balance.year,
        base_limit_days=balance.base_limit_days,
        carried_over_days=balance.carried_over_days,
        used_days=balance.used_days,
        on_demand_used_days=balance.on_demand_used_days,
        total_available_days=total_available_days,
        remaining_days=remaining_days,
        remaining_on_demand_days=remaining_on_demand_days,
        employee_name=build_full_name(employee),
        employee_department=employee.department if employee else None,
        employee_job_title=employee.job_title if employee else None,
    )


def validate_leave_balance_for_request(
    user_id: int,
    leave_type: str,
    total_days: int,
    db: Session,
    year: int,
):
    balance_required_types = ["wypoczynkowy", "na_zadanie"]

    if leave_type not in balance_required_types:
        return

    balance = db.query(LeaveBalance).filter(
        LeaveBalance.user_id == user_id,
        LeaveBalance.year == year,
    ).first()

    if not balance:
        raise HTTPException(
            status_code=400,
            detail="Brak salda urlopowego dla tego roku. Skontaktuj się z działem kadr.",
        )

    total_available_days = balance.base_limit_days + balance.carried_over_days
    remaining_days = total_available_days - balance.used_days

    if total_days > remaining_days:
        raise HTTPException(
            status_code=400,
            detail=f"Brak wystarczającego salda urlopowego. Pozostało {remaining_days} dni.",
        )

    if leave_type == "na_zadanie":
        remaining_on_demand_days = 4 - balance.on_demand_used_days

        if total_days > remaining_on_demand_days:
            raise HTTPException(
                status_code=400,
                detail=f"Brak wystarczającego limitu urlopu na żądanie. Pozostało {remaining_on_demand_days} dni.",
            )


def apply_leave_balance_on_approval(
    leave: LeaveRequest,
    db: Session,
):
    balance_required_types = ["wypoczynkowy", "na_zadanie"]

    if leave.leave_type not in balance_required_types:
        return

    total_days = calculate_leave_days(leave.start_date, leave.end_date)

    balance = db.query(LeaveBalance).filter(
        LeaveBalance.user_id == leave.user_id,
        LeaveBalance.year == leave.start_date.year,
    ).first()

    if not balance:
        raise HTTPException(
            status_code=400,
            detail="Nie można zaakceptować wniosku bez salda urlopowego dla tego roku.",
        )

    total_available_days = balance.base_limit_days + balance.carried_over_days
    remaining_days = total_available_days - balance.used_days

    if total_days > remaining_days:
        raise HTTPException(
            status_code=400,
            detail=f"Nie można zaakceptować wniosku. Pozostało tylko {remaining_days} dni salda urlopowego.",
        )

    if leave.leave_type == "na_zadanie":
        remaining_on_demand_days = 4 - balance.on_demand_used_days

        if total_days > remaining_on_demand_days:
            raise HTTPException(
                status_code=400,
                detail=f"Nie można zaakceptować wniosku. Pozostało tylko {remaining_on_demand_days} dni urlopu na żądanie.",
            )

        balance.on_demand_used_days += total_days

    balance.used_days += total_days


def build_team_calendar_event(leave: LeaveRequest, db: Session):
    employee = db.query(User).filter(User.id == leave.user_id).first()

    return {
        "id": leave.id,
        "user_id": leave.user_id,
        "employee_name": build_full_name(employee),
        "employee_department": employee.department if employee else None,
        "employee_job_title": employee.job_title if employee else None,
        "leave_type": leave.leave_type,
        "status": leave.status,
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "total_days": calculate_leave_days(leave.start_date, leave.end_date),
        "decision_comment": leave.decision_comment,
    }


# -----------------------
# HELPERY DOKUMENTÓW
# -----------------------

def can_view_user_documents(target_user: User, current_user: dict) -> bool:
    current_role = current_user.get("role")
    current_user_id = int(current_user.get("sub"))

    if current_role in ["admin", "kadry", "zarzad"]:
        return True

    if current_role == "kierownik":
        if target_user.id == current_user_id:
            return True
        if target_user.manager_user_id == current_user_id:
            return True
        return False

    return target_user.id == current_user_id


def can_manage_user_documents(current_user: dict) -> bool:
    return current_user.get("role") in ["admin", "kadry"]


def build_employee_document_response(document: EmployeeDocument, db: Session) -> EmployeeDocumentResponse:
    uploaded_by = db.query(User).filter(User.id == document.uploaded_by_user_id).first()

    uploaded_by_name = None
    if uploaded_by:
        uploaded_by_name = f"{uploaded_by.first_name} {uploaded_by.last_name}"

    return EmployeeDocumentResponse(
        id=document.id,
        user_id=document.user_id,
        uploaded_by_user_id=document.uploaded_by_user_id,
        document_type=document.document_type,
        title=document.title,
        description=document.description,
        original_file_name=document.original_file_name,
        mime_type=document.mime_type,
        file_size=document.file_size,
        document_date=document.document_date,
        created_at=document.created_at,
        uploaded_by_name=uploaded_by_name,
    )


# -----------------------
# ROOT
# -----------------------

@app.get("/")
def root():
    return {"message": "ERP działa"}


# -----------------------
# AUTH / LOGIN
# -----------------------

@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user:
        raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Konto jest nieaktywne")

    if not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

    token = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "job_title": user.job_title,
            "manager_user_id": user.manager_user_id,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "must_change_password": user.must_change_password,
    }


# -----------------------
# USERS - MY PROFILE
# -----------------------

@app.get("/me", response_model=UserResponse)
def get_me(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = int(current_user.get("sub"))

    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True,
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    return user


# -----------------------
# USERS - CREATE
# -----------------------

@app.post("/users", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")

    if current_role not in ["admin", "kadry"]:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    if current_role == "kadry" and user.role == "admin":
        raise HTTPException(status_code=403, detail="Kadry nie mogą nadawać roli admin")

    if user.leave_seniority_years < 0:
        raise HTTPException(status_code=400, detail="Lata do urlopu nie mogą być ujemne")

    existing_employee_number = (
        db.query(User)
        .filter(User.employee_number == user.employee_number)
        .first()
    )
    if existing_employee_number:
        raise HTTPException(status_code=400, detail="Numer pracownika już istnieje")

    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email już istnieje")

    if user.manager_user_id is not None:
        manager = db.query(User).filter(
            User.id == user.manager_user_id,
            User.is_active == True,
        ).first()

        if not manager:
            raise HTTPException(status_code=400, detail="Wybrany przełożony nie istnieje")

    hashed_password = hash_password(user.password)

    db_user = User(
        employee_number=user.employee_number,
        first_name=user.first_name,
        last_name=user.last_name,
        department=user.department,
        role=user.role,
        job_title=user.job_title,
        manager_user_id=user.manager_user_id,
        leave_seniority_years=user.leave_seniority_years,
        hire_date=user.hire_date,
        email=user.email,
        password=hashed_password,
        is_active=True,
        must_change_password=True,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    create_initial_leave_balance_for_user(
        user_id=db_user.id,
        leave_seniority_years=db_user.leave_seniority_years,
        db=db,
    )

    db.commit()
    db.refresh(db_user)

    return db_user


# -----------------------
# USERS - GET
# -----------------------

@app.get("/users", response_model=list[UserResponse])
def get_users(
    name: str | None = Query(default=None),
    department: str | None = Query(default=None),
    role: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")
    current_email = current_user.get("email")
    current_user_id = int(current_user.get("sub"))

    query = db.query(User)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if current_role in ["admin", "kadry", "zarzad"]:
        pass
    elif current_role == "kierownik":
        query = query.filter(
            or_(
                User.manager_user_id == current_user_id,
                User.id == current_user_id,
            )
        )
    else:
        query = query.filter(User.email == current_email)

    if name:
        query = query.filter(
            or_(
                User.first_name.ilike(f"%{name}%"),
                User.last_name.ilike(f"%{name}%"),
            )
        )

    if department:
        query = query.filter(User.department.ilike(f"%{department}%"))

    if role:
        query = query.filter(User.role.ilike(f"%{role}%"))

    users = query.all()
    return users


# -----------------------
# USERS - UPDATE
# -----------------------

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")

    if current_role not in ["admin", "kadry"]:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    if current_role == "kadry" and user_data.role == "admin":
        raise HTTPException(status_code=403, detail="Kadry nie mogą nadawać roli admin")

    if user_data.leave_seniority_years < 0:
        raise HTTPException(status_code=400, detail="Lata do urlopu nie mogą być ujemne")

    existing_employee_number = (
        db.query(User)
        .filter(
            User.employee_number == user_data.employee_number,
            User.id != user_id,
        )
        .first()
    )
    if existing_employee_number:
        raise HTTPException(status_code=400, detail="Numer pracownika już istnieje")

    existing_email = (
        db.query(User)
        .filter(
            User.email == user_data.email,
            User.id != user_id,
        )
        .first()
    )
    if existing_email:
        raise HTTPException(status_code=400, detail="Email już istnieje")

    if user_data.manager_user_id is not None:
        if user_data.manager_user_id == user_id:
            raise HTTPException(status_code=400, detail="Użytkownik nie może być swoim własnym przełożonym")

        manager = db.query(User).filter(
            User.id == user_data.manager_user_id,
            User.is_active == True,
        ).first()

        if not manager:
            raise HTTPException(status_code=400, detail="Wybrany przełożony nie istnieje")

    user.employee_number = user_data.employee_number
    user.first_name = user_data.first_name
    user.last_name = user_data.last_name
    user.department = user_data.department
    user.role = user_data.role
    user.job_title = user_data.job_title
    user.manager_user_id = user_data.manager_user_id
    user.leave_seniority_years = user_data.leave_seniority_years
    user.hire_date = user_data.hire_date
    user.email = user_data.email

    if user_data.password:
        user.password = hash_password(user_data.password)
        user.must_change_password = True

    db.commit()
    db.refresh(user)

    return user


# -----------------------
# USERS - DELETE
# -----------------------

@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    user.is_active = False
    db.commit()

    return {"message": "Użytkownik został dezaktywowany"}


# -----------------------
# USERS - RESTORE
# -----------------------

@app.patch("/users/{user_id}/restore")
def restore_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    user.is_active = True
    db.commit()

    return {"message": "Użytkownik został przywrócony"}


# -----------------------
# USERS - GET ONE
# -----------------------

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")
    current_email = current_user.get("email")
    current_user_id = int(current_user.get("sub"))

    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True,
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    if current_role in ["admin", "kadry", "zarzad"]:
        return user

    if current_role == "kierownik":
        if user.id == current_user_id:
            return user

        if user.manager_user_id != current_user_id:
            raise HTTPException(status_code=403, detail="Brak uprawnień")

        return user

    if user.email != current_email:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    return user


# -----------------------
# USERS - RESET PASSWORD
# -----------------------

@app.patch("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    password_data: UserPasswordReset,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    user.password = hash_password(password_data.new_password)
    user.must_change_password = True
    db.commit()

    return {"message": "Hasło zostało zresetowane"}


# -----------------------
# USERS - CHANGE OWN PASSWORD
# -----------------------

@app.patch("/me/change-password")
def change_own_password(
    password_data: ChangeOwnPassword,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = int(current_user.get("sub"))

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    if not verify_password(password_data.old_password, user.password):
        raise HTTPException(status_code=400, detail="Aktualne hasło jest nieprawidłowe")

    user.password = hash_password(password_data.new_password)
    user.must_change_password = False
    db.commit()

    return {"message": "Hasło zostało zmienione"}


# -----------------------
# LEAVE REQUESTS - CREATE
# -----------------------

@app.post("/leave_requests", response_model=LeaveRequestResponse)
def create_leave_request(
    leave_data: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = int(current_user.get("sub"))
    manager_id = current_user.get("manager_user_id")

    if leave_data.end_date < leave_data.start_date:
        raise HTTPException(
            status_code=400,
            detail="Data zakończenia nie może być wcześniejsza niż data rozpoczęcia",
        )

    if leave_data.leave_type not in ALLOWED_LEAVE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Nieprawidłowy typ wniosku",
        )

    if manager_id is not None:
        manager = db.query(User).filter(
            User.id == manager_id,
            User.is_active == True,
        ).first()

        if not manager:
            raise HTTPException(status_code=400, detail="Przełożony użytkownika nie istnieje")

    if leave_data.substitute_id is not None:
        substitute = db.query(User).filter(
            User.id == leave_data.substitute_id,
            User.is_active == True,
        ).first()

        if not substitute:
            raise HTTPException(status_code=400, detail="Wybrany zastępujący nie istnieje")

    total_days = calculate_leave_days(leave_data.start_date, leave_data.end_date)

    validate_leave_balance_for_request(
        user_id=user_id,
        leave_type=leave_data.leave_type,
        total_days=total_days,
        db=db,
        year=leave_data.start_date.year,
    )

    leave = LeaveRequest(
        user_id=user_id,
        manager_id=manager_id,
        substitute_id=leave_data.substitute_id,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        leave_type=leave_data.leave_type,
        status="pending",
        notes=leave_data.notes,
    )

    db.add(leave)
    db.commit()
    db.refresh(leave)

    return build_leave_response(leave, db)


# -----------------------
# LEAVE REQUESTS - MY
# -----------------------

@app.get("/leave_requests/my", response_model=list[LeaveRequestResponse])
def get_my_leave_requests(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = int(current_user.get("sub"))

    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.user_id == user_id
    ).order_by(LeaveRequest.id.desc()).all()

    return [build_leave_response(leave, db) for leave in leaves]


# -----------------------
# LEAVE REQUESTS - USER HISTORY
# -----------------------

@app.get("/users/{user_id}/leave_requests", response_model=list[LeaveRequestResponse])
def get_user_leave_requests(
    user_id: int,
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")
    current_user_id = int(current_user.get("sub"))

    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True,
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    if current_role in ["admin", "kadry", "zarzad"]:
        pass
    elif current_role == "kierownik":
        if user.id != current_user_id and user.manager_user_id != current_user_id:
            raise HTTPException(status_code=403, detail="Brak uprawnień")
    else:
        if user_id != current_user_id:
            raise HTTPException(status_code=403, detail="Brak uprawnień")

    query = db.query(LeaveRequest).filter(LeaveRequest.user_id == user_id)

    if status:
        query = query.filter(LeaveRequest.status == status)

    leaves = query.order_by(LeaveRequest.id.desc()).all()
    return [build_leave_response(leave, db) for leave in leaves]


# -----------------------
# LEAVE REQUESTS - PENDING
# -----------------------

@app.get("/leave_requests/pending", response_model=list[LeaveRequestResponse])
def get_pending_leave_requests(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")
    current_user_id = int(current_user.get("sub"))

    query = db.query(LeaveRequest).filter(LeaveRequest.status == "pending")

    if current_role in ["admin", "kadry", "zarzad"]:
        leaves = query.order_by(LeaveRequest.id.desc()).all()
        return [build_leave_response(leave, db) for leave in leaves]

    if current_role == "kierownik":
        leaves = query.filter(LeaveRequest.manager_id == current_user_id).order_by(LeaveRequest.id.desc()).all()
        return [build_leave_response(leave, db) for leave in leaves]

    raise HTTPException(status_code=403, detail="Brak uprawnień")


# -----------------------
# LEAVE REQUESTS - DECISION
# -----------------------

@app.patch("/leave_requests/{leave_id}/decision")
def decide_leave_request(
    leave_id: int,
    decision_data: LeaveRequestDecision,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")
    current_user_id = int(current_user.get("sub"))

    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()

    if not leave:
        raise HTTPException(status_code=404, detail="Wniosek nie istnieje")

    if current_role == "kierownik":
        if leave.manager_id != current_user_id:
            raise HTTPException(status_code=403, detail="Nie możesz decydować o tym wniosku")
    elif current_role not in ["admin", "kadry", "zarzad"]:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    if leave.status != "pending":
        raise HTTPException(status_code=400, detail="Ten wniosek został już rozpatrzony")

    if decision_data.decision == "approved":
        apply_leave_balance_on_approval(leave, db)

    leave.status = decision_data.decision
    leave.decision_comment = decision_data.decision_comment
    leave.decided_by_user_id = current_user_id
    leave.decision_date = date.today()

    db.commit()
    db.refresh(leave)

    return {"message": f"Wniosek {decision_data.decision}"}


# -----------------------
# LEAVE REQUESTS - HISTORY
# -----------------------

@app.get("/leave_requests/history", response_model=list[LeaveRequestResponse])
def get_leave_requests_history(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")
    current_user_id = int(current_user.get("sub"))

    query = db.query(LeaveRequest)

    if current_role in ["admin", "kadry", "zarzad"]:
        pass
    elif current_role == "kierownik":
        query = query.filter(LeaveRequest.manager_id == current_user_id)
    else:
        query = query.filter(LeaveRequest.user_id == current_user_id)

    if status:
        query = query.filter(LeaveRequest.status == status)

    leaves = query.order_by(LeaveRequest.id.desc()).all()
    return [build_leave_response(leave, db) for leave in leaves]


# -----------------------
# LEAVE REQUESTS - SUMMARY
# -----------------------

@app.get("/leave_requests/summary")
def get_leave_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = int(current_user.get("sub"))

    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.user_id == user_id
    ).all()

    total_requests = len(leaves)
    approved = [l for l in leaves if l.status == "approved"]
    pending = [l for l in leaves if l.status == "pending"]
    rejected = [l for l in leaves if l.status == "rejected"]

    total_days = sum(
        calculate_leave_days(l.start_date, l.end_date)
        for l in approved
    )

    return {
        "total_requests": total_requests,
        "approved_requests": len(approved),
        "pending_requests": len(pending),
        "rejected_requests": len(rejected),
        "total_approved_days": total_days,
    }


# -----------------------
# LEAVE REQUESTS - DETAILS
# -----------------------

@app.get("/leave_requests/{leave_id}")
def get_leave_request_details(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")
    current_user_id = int(current_user.get("sub"))

    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()

    if not leave:
        raise HTTPException(status_code=404, detail="Wniosek nie istnieje")

    if current_role in ["admin", "kadry", "zarzad"]:
        return build_leave_details_response(leave, db)

    if current_role == "kierownik":
        if leave.manager_id != current_user_id:
            raise HTTPException(status_code=403, detail="Brak uprawnień")
        return build_leave_details_response(leave, db)

    if leave.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    return build_leave_details_response(leave, db)


# -----------------------
# LEAVE BALANCE - MY
# -----------------------

@app.get("/leave_balance/me", response_model=LeaveBalanceResponse)
def get_my_leave_balance(
    year: int = Query(default=date.today().year),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = int(current_user.get("sub"))

    balance = db.query(LeaveBalance).filter(
        LeaveBalance.user_id == user_id,
        LeaveBalance.year == year,
    ).first()

    if not balance:
        raise HTTPException(status_code=404, detail="Nie znaleziono salda urlopowego dla tego roku")

    return build_leave_balance_response(balance, db)


# -----------------------
# LEAVE BALANCE - GET ONE USER
# -----------------------

@app.get("/leave_balance/{user_id}", response_model=LeaveBalanceResponse)
def get_user_leave_balance(
    user_id: int,
    year: int = Query(default=date.today().year),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")
    current_user_id = int(current_user.get("sub"))

    if current_role in ["admin", "kadry", "zarzad"]:
        pass
    elif current_role == "kierownik":
        employee = db.query(User).filter(
            User.id == user_id,
            User.is_active == True,
        ).first()

        if not employee:
            raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

        if employee.id != current_user_id and employee.manager_user_id != current_user_id:
            raise HTTPException(status_code=403, detail="Brak uprawnień")
    else:
        if user_id != current_user_id:
            raise HTTPException(status_code=403, detail="Brak uprawnień")

    balance = db.query(LeaveBalance).filter(
        LeaveBalance.user_id == user_id,
        LeaveBalance.year == year,
    ).first()

    if not balance:
        raise HTTPException(status_code=404, detail="Nie znaleziono salda urlopowego dla tego roku")

    return build_leave_balance_response(balance, db)


# -----------------------
# LEAVE BALANCE - CREATE
# -----------------------

@app.post("/leave_balance", response_model=LeaveBalanceResponse)
def create_leave_balance(
    balance_data: LeaveBalanceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")

    if current_role not in ["admin", "kadry"]:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    user = db.query(User).filter(
        User.id == balance_data.user_id,
        User.is_active == True,
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    existing_balance = db.query(LeaveBalance).filter(
        LeaveBalance.user_id == balance_data.user_id,
        LeaveBalance.year == balance_data.year,
    ).first()

    if existing_balance:
        raise HTTPException(status_code=400, detail="Saldo dla tego użytkownika i roku już istnieje")

    balance = LeaveBalance(
        user_id=balance_data.user_id,
        year=balance_data.year,
        base_limit_days=balance_data.base_limit_days,
        carried_over_days=balance_data.carried_over_days,
        used_days=0,
        on_demand_used_days=0,
    )

    db.add(balance)
    db.commit()
    db.refresh(balance)

    return build_leave_balance_response(balance, db)


# -----------------------
# LEAVE BALANCE - UPDATE
# -----------------------

@app.put("/leave_balance/{balance_id}", response_model=LeaveBalanceResponse)
def update_leave_balance(
    balance_id: int,
    balance_data: LeaveBalanceUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")

    if current_role not in ["admin", "kadry"]:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    balance = db.query(LeaveBalance).filter(LeaveBalance.id == balance_id).first()

    if not balance:
        raise HTTPException(status_code=404, detail="Saldo urlopowe nie istnieje")

    balance.base_limit_days = balance_data.base_limit_days
    balance.carried_over_days = balance_data.carried_over_days

    db.commit()
    db.refresh(balance)

    return build_leave_balance_response(balance, db)


# -----------------------
# TEAM CALENDAR
# -----------------------

@app.get("/team/calendar")
def get_team_calendar(
    year: int = Query(default=date.today().year),
    month: int = Query(default=date.today().month),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")
    current_user_id = int(current_user.get("sub"))

    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Nieprawidłowy miesiąc")

    if current_role not in ["kierownik", "admin", "kadry", "zarzad"]:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    month_start = date(year, month, 1)
    month_end = date(year, month, calendar.monthrange(year, month)[1])

    if current_role == "kierownik":
        team_users = db.query(User).filter(
            User.manager_user_id == current_user_id,
            User.is_active == True,
        ).all()

        team_user_ids = [user.id for user in team_users]

        if not team_user_ids:
            return {
                "year": year,
                "month": month,
                "events": [],
            }

        leaves = db.query(LeaveRequest).filter(
            LeaveRequest.user_id.in_(team_user_ids),
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= month_end,
            LeaveRequest.end_date >= month_start,
        ).order_by(LeaveRequest.start_date.asc(), LeaveRequest.id.asc()).all()

    else:
        leaves = db.query(LeaveRequest).filter(
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= month_end,
            LeaveRequest.end_date >= month_start,
        ).order_by(LeaveRequest.start_date.asc(), LeaveRequest.id.asc()).all()

    return {
        "year": year,
        "month": month,
        "events": [build_team_calendar_event(leave, db) for leave in leaves],
    }


# -----------------------
# MANAGER DASHBOARD SUMMARY
# -----------------------

@app.get("/manager/dashboard-summary")
def get_manager_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_role = current_user.get("role")
    current_user_id = int(current_user.get("sub"))

    if current_role not in ["kierownik", "admin", "kadry", "zarzad"]:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    today = date.today()
    tomorrow = date.fromordinal(today.toordinal() + 1)

    if current_role == "kierownik":
        team_users = db.query(User).filter(
            User.manager_user_id == current_user_id,
            User.is_active == True,
        ).all()

        team_user_ids = [user.id for user in team_users]

        if not team_user_ids:
            return {
                "team_count": 0,
                "pending_requests_count": 0,
                "today_absences": [],
                "tomorrow_absences": [],
                "upcoming_absences": [],
            }

        pending_requests = db.query(LeaveRequest).filter(
            LeaveRequest.manager_id == current_user_id,
            LeaveRequest.status == "pending",
        ).all()

        approved_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.user_id.in_(team_user_ids),
            LeaveRequest.status == "approved",
        ).order_by(LeaveRequest.start_date.asc()).all()

    else:
        team_users = db.query(User).filter(User.is_active == True).all()

        pending_requests = db.query(LeaveRequest).filter(
            LeaveRequest.status == "pending",
        ).all()

        approved_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.status == "approved",
        ).order_by(LeaveRequest.start_date.asc()).all()

    today_absences = [
        build_team_calendar_event(leave, db)
        for leave in approved_leaves
        if is_leave_active_on_day(leave, today)
    ]

    tomorrow_absences = [
        build_team_calendar_event(leave, db)
        for leave in approved_leaves
        if is_leave_active_on_day(leave, tomorrow)
    ]

    upcoming_absences = [
        build_team_calendar_event(leave, db)
        for leave in approved_leaves
        if leave.start_date > today
    ][:5]

    return {
        "team_count": len(team_users),
        "pending_requests_count": len(pending_requests),
        "today_absences": today_absences,
        "tomorrow_absences": tomorrow_absences,
        "upcoming_absences": upcoming_absences,
    }


# -----------------------
# EMPLOYEE DOCUMENTS - LIST
# -----------------------

@app.get("/users/{user_id}/documents", response_model=list[EmployeeDocumentResponse])
def get_user_documents(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    target_user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True,
    ).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    if not can_view_user_documents(target_user, current_user):
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    documents = db.query(EmployeeDocument).filter(
        EmployeeDocument.user_id == user_id
    ).order_by(EmployeeDocument.created_at.desc(), EmployeeDocument.id.desc()).all()

    return [build_employee_document_response(document, db) for document in documents]


# -----------------------
# EMPLOYEE DOCUMENTS - UPLOAD
# -----------------------

@app.post("/users/{user_id}/documents", response_model=EmployeeDocumentResponse)
def upload_user_document(
    user_id: int,
    document_type: str = Form(...),
    title: str = Form(...),
    description: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not can_manage_user_documents(current_user):
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    target_user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True,
    ).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Nieprawidłowy typ dokumentu")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Nie wybrano pliku")

    employee_dir = EMPLOYEE_DOCUMENTS_DIR / str(user_id)
    employee_dir.mkdir(parents=True, exist_ok=True)

    file_extension = Path(file.filename).suffix
    unique_name = f"{uuid.uuid4().hex}{file_extension}"
    target_path = employee_dir / unique_name

    with target_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    storage_key = f"employee-documents/{user_id}/{unique_name}"
    file_size = target_path.stat().st_size if target_path.exists() else 0

    document = EmployeeDocument(
        user_id=user_id,
        uploaded_by_user_id=int(current_user.get("sub")),
        document_type=document_type,
        title=title.strip(),
        description=description.strip() if description else None,
        original_file_name=file.filename,
        stored_file_name=unique_name,
        storage_key=storage_key,
        mime_type=file.content_type,
        file_size=file_size,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return build_employee_document_response(document, db)


# -----------------------
# EMPLOYEE DOCUMENTS - DOWNLOAD
# -----------------------

@app.get("/documents/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    document = db.query(EmployeeDocument).filter(EmployeeDocument.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Dokument nie istnieje")

    target_user = db.query(User).filter(
        User.id == document.user_id,
        User.is_active == True,
    ).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    if not can_view_user_documents(target_user, current_user):
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    file_path = UPLOAD_ROOT / document.storage_key

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Plik nie istnieje na dysku")

    return FileResponse(
        path=file_path,
        filename=document.original_file_name,
        media_type=document.mime_type or "application/octet-stream",
    )


# -----------------------
# EMPLOYEE DOCUMENTS - DELETE
# -----------------------

@app.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not can_manage_user_documents(current_user):
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    document = db.query(EmployeeDocument).filter(EmployeeDocument.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Dokument nie istnieje")

    file_path = UPLOAD_ROOT / document.storage_key

    if file_path.exists():
        os.remove(file_path)

    db.delete(document)
    db.commit()

    return {"message": "Dokument został usunięty"}