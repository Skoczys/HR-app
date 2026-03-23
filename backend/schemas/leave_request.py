from datetime import date
from pydantic import BaseModel


# -----------------------
# SCHEMAT TWORZENIA WNIOSKU
# -----------------------

class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    leave_type: str
    substitute_id: int | None = None
    notes: str | None = None


# -----------------------
# SCHEMAT ODPOWIEDZI WNIOSKU
# -----------------------

class LeaveRequestResponse(BaseModel):
    id: int
    user_id: int
    manager_id: int | None
    substitute_id: int | None
    start_date: date
    end_date: date
    leave_type: str
    status: str
    notes: str | None
    total_days: int

    class Config:
        from_attributes = True