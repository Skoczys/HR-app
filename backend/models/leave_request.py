from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


# -----------------------
# MODEL WNIOSKU URLOPOWEGO
# -----------------------

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    # id wniosku
    id = Column(Integer, primary_key=True, index=True)

    # kto składa wniosek
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # przełożony, do którego trafia wniosek
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # osoba zastępująca
    substitute_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # zakres urlopu
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # typ urlopu
    # wypoczynkowy / na_zadanie / okolicznosciowy / bezplatny
    leave_type = Column(String, nullable=False)

    # status wniosku: pending / approved / rejected
    status = Column(String, default="pending", nullable=False)

    # dodatkowe uwagi
    notes = Column(String, nullable=True)

    # decyzja
    decision_comment = Column(String, nullable=True)
    decided_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    decision_date = Column(Date, nullable=True)

    # relacje
    user = relationship("User", foreign_keys=[user_id])
    manager = relationship("User", foreign_keys=[manager_id])
    substitute = relationship("User", foreign_keys=[substitute_id])
    decided_by = relationship("User", foreign_keys=[decided_by_user_id])


# -----------------------
# MODEL SALDA URLOPOWEGO
# -----------------------

class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)

    # pracownik
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # rok kalendarzowy
    year = Column(Integer, nullable=False)

    # podstawowy limit urlopu wypoczynkowego w danym roku
    # np. 20 albo 26, ustawiany przez kadry/admin
    base_limit_days = Column(Integer, nullable=False, default=26)

    # urlop zaległy przeniesiony z poprzedniego roku
    carried_over_days = Column(Integer, nullable=False, default=0)

    # wykorzystane dni z całej puli wypoczynkowej
    # tu liczymy: wypoczynkowy + na_zadanie
    used_days = Column(Integer, nullable=False, default=0)

    # ile dni urlopu na żądanie wykorzystano w danym roku
    # limit prawny: max 4
    on_demand_used_days = Column(Integer, nullable=False, default=0)

    # relacja
    user = relationship("User", foreign_keys=[user_id])