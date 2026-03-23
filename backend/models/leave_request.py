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
    leave_type = Column(String, nullable=False)

    # status wniosku: pending / approved / rejected
    status = Column(String, default="pending", nullable=False)

    # dodatkowe uwagi
    notes = Column(String, nullable=True)

    # relacja do użytkownika składającego wniosek
    user = relationship("User", foreign_keys=[user_id])