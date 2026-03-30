from datetime import date
from pydantic import BaseModel, EmailStr


# -----------------------
# SCHEMAT TWORZENIA UZYTKOWNIKA
# -----------------------

class UserCreate(BaseModel):
    employee_number: str
    first_name: str
    last_name: str
    department: str
    role: str
    job_title: str | None = None
    manager_user_id: int | None = None
    leave_seniority_years: int
    hire_date: date
    email: EmailStr
    password: str


# -----------------------
# SCHEMAT EDYCJI UZYTKOWNIKA
# -----------------------

class UserUpdate(BaseModel):
    employee_number: str
    first_name: str
    last_name: str
    department: str
    role: str
    job_title: str | None = None
    manager_user_id: int | None = None
    leave_seniority_years: int
    hire_date: date
    email: EmailStr
    password: str | None = None


# -----------------------
# SCHEMAT ODPOWIEDZI UZYTKOWNIKA
# -----------------------

class UserResponse(BaseModel):
    id: int
    employee_number: str
    first_name: str
    last_name: str
    department: str
    role: str
    job_title: str | None
    manager_user_id: int | None
    leave_seniority_years: int
    hire_date: date
    email: EmailStr
    is_active: bool
    must_change_password: bool

    class Config:
        from_attributes = True


# -----------------------
# SCHEMAT ZMIANY WLASNEGO HASLA
# -----------------------

class UserPasswordReset(BaseModel):
    new_password: str


class ChangeOwnPassword(BaseModel):
    old_password: str
    new_password: str