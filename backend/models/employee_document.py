from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class EmployeeDocument(Base):
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    document_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    original_file_name = Column(String, nullable=False)
    stored_file_name = Column(String, nullable=False)
    storage_key = Column(String, nullable=False, unique=True)

    mime_type = Column(String, nullable=True)
    file_size = Column(Integer, nullable=False, default=0)

    document_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_user_id])