from datetime import date
from pydantic import BaseModel, field_validator


ALLOWED_LEAVE_TYPES = [
    "wypoczynkowy",
    "na_zadanie",
    "chorobowe",
    "okolicznosciowy",
    "bezplatny",
]

ALLOWED_DECISIONS = [
    "approved",
    "rejected",
]


class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    leave_type: str
    substitute_id: int | None = None
    notes: str | None = None

    @field_validator("leave_type")
    @classmethod
    def validate_leave_type(cls, value: str) -> str:
        if value not in ALLOWED_LEAVE_TYPES:
            raise ValueError(
                f"Nieprawidłowy typ urlopu. Dozwolone: {', '.join(ALLOWED_LEAVE_TYPES)}"
            )
        return value

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, value: date, info) -> date:
        start_date = info.data.get("start_date")
        if start_date and value < start_date:
            raise ValueError("Data zakończenia nie może być wcześniejsza niż data rozpoczęcia")
        return value


class LeaveRequestDecision(BaseModel):
    decision: str
    decision_comment: str | None = None

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, value: str) -> str:
        if value not in ALLOWED_DECISIONS:
            raise ValueError(
                f"Nieprawidłowa decyzja. Dozwolone: {', '.join(ALLOWED_DECISIONS)}"
            )
        return value

    @field_validator("decision_comment")
    @classmethod
    def validate_rejection_comment(cls, value: str | None, info) -> str | None:
        decision = info.data.get("decision")
        if decision == "rejected" and (value is None or not value.strip()):
            raise ValueError("Komentarz jest wymagany przy odrzuceniu wniosku")
        return value


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


class LeaveBalanceCreate(BaseModel):
    user_id: int
    year: int
    base_limit_days: int
    carried_over_days: int = 0

    @field_validator("base_limit_days", "carried_over_days")
    @classmethod
    def validate_non_negative(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Wartość nie może być ujemna")
        return value


class LeaveBalanceUpdate(BaseModel):
    base_limit_days: int
    carried_over_days: int = 0

    @field_validator("base_limit_days", "carried_over_days")
    @classmethod
    def validate_non_negative(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Wartość nie może być ujemna")
        return value


class LeaveBalanceResponse(BaseModel):
    id: int
    user_id: int
    year: int

    base_limit_days: int
    carried_over_days: int
    used_days: int
    on_demand_used_days: int

    total_available_days: int
    remaining_days: int
    remaining_on_demand_days: int

    employee_name: str | None = None
    employee_department: str | None = None
    employee_job_title: str | None = None

    class Config:
        from_attributes = True