from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import SessionLocal, engine, Base
from models.user import User
from models.leave_request import LeaveRequest
from schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserPasswordReset,
    ChangeOwnPassword,
)
from schemas.leave_request import LeaveRequestCreate, LeaveRequestResponse
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
# BAZA DANYCH
# -----------------------

# tworzenie tabel przy starcie aplikacji
Base.metadata.create_all(bind=engine)


# dependency do sesji bazy danych
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------
# LEAVE REQUESTS - HELPERS
# -----------------------

def calculate_leave_days(start_date, end_date):
    return (end_date - start_date).days + 1


def build_leave_response(leave: LeaveRequest) -> LeaveRequestResponse:
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
        hire_date=user.hire_date,
        email=user.email,
        password=hashed_password,
        must_change_password=False,
    )

    db.add(db_user)
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
    current_department = current_user.get("department")

    query = db.query(User)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if current_role in ["admin", "kadry", "zarzad"]:
        pass
    elif current_role == "kierownik":
        query = query.filter(User.department == current_department)
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
    user.hire_date = user_data.hire_date
    user.email = user_data.email

    if user_data.password:
        user.password = hash_password(user_data.password)

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
    current_department = current_user.get("department")

    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True,
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    if current_role in ["admin", "kadry", "zarzad"]:
        return user

    if current_role == "kierownik":
        if user.department != current_department:
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

    return build_leave_response(leave)


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
    ).all()

    return [build_leave_response(leave) for leave in leaves]


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
        leaves = query.all()
        return [build_leave_response(leave) for leave in leaves]

    if current_role == "kierownik":
        leaves = query.filter(LeaveRequest.manager_id == current_user_id).all()
        return [build_leave_response(leave) for leave in leaves]

    raise HTTPException(status_code=403, detail="Brak uprawnień")


# -----------------------
# LEAVE REQUESTS - DECISION
# -----------------------

@app.patch("/leave_requests/{leave_id}/decision")
def decide_leave_request(
    leave_id: int,
    decision: str,
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

    if decision not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Zła decyzja")

    leave.status = decision
    db.commit()
    db.refresh(leave)

    return {"message": f"Wniosek {decision}"}


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
    return [build_leave_response(leave) for leave in leaves]


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