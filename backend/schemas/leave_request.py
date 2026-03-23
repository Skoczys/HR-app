from pydantic import BaseModel
from datetime import date


class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    leave_type: str
    substitute_id: int | None = None
    notes: str | None = None


class LeaveRequestDecision(BaseModel):
    decision: str
    decision_comment: str | None = None


class LeaveRequestResponse(BaseModel):
    id: int

    user_id: int
    manager_id: int | None = None
    substitute_id: int | None = None

    start_date: date
    end_date: date
    leave_type: str
    status: str
    notes: str | None = None
    total_days: int

    decision_comment: str | None = None
    decided_by_user_id: int | None = None
    decision_date: date | None = None

    employee_name: str | None = None
    employee_department: str | None = None
    employee_job_title: str | None = None

    manager_name: str | None = None
    substitute_name: str | None = None
    decided_by_name: str | None = None

    class Config:
        from_attributes = True