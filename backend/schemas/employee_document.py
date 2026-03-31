from datetime import datetime
from pydantic import BaseModel


class EmployeeDocumentResponse(BaseModel):
    id: int
    user_id: int
    uploaded_by_user_id: int

    document_type: str
    title: str
    description: str | None = None

    original_file_name: str
    mime_type: str | None = None
    file_size: int

    document_date: datetime | None = None
    created_at: datetime

    uploaded_by_name: str | None = None

    class Config:
        from_attributes = True