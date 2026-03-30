from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from database import Base


# -----------------------
# MODEL UZYTKOWNIKA
# -----------------------

class User(Base):
    __tablename__ = "users"

    # id techniczne użytkownika
    id = Column(Integer, primary_key=True, index=True)

    # numer pracownika
    employee_number = Column(String, unique=True, index=True, nullable=False)

    # dane osobowe
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)

    # struktura organizacyjna
    department = Column(String, nullable=False)

    # rola systemowa
    # pracownik / kierownik / kadry / zarzad / admin
    role = Column(String, nullable=False)

    # stanowisko opisowe
    job_title = Column(String, nullable=True)

    # bezpośredni przełożony
    manager_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # lata do wyliczenia wymiaru urlopu
    leave_seniority_years = Column(Integer, nullable=False, default=0)

    # data zatrudnienia
    hire_date = Column(Date, nullable=False)

    # logowanie
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

    # status konta
    is_active = Column(Boolean, default=True)

    # czy użytkownik musi zmienić hasło przy następnym logowaniu
    must_change_password = Column(Boolean, default=False)