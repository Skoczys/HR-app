from datetime import date

from database import SessionLocal
from models.user import User
from security import hash_password

ADMIN_EMAIL = "admin@famak.pl"
ADMIN_PASSWORD = "Admin123!"
ADMIN_EMPLOYEE_NUMBER = "ADM001"
ADMIN_FIRST_NAME = "Patryk"
ADMIN_LAST_NAME = "Admin"
ADMIN_DEPARTMENT = "Administracja"
ADMIN_ROLE = "admin"
ADMIN_JOB_TITLE = "Administrator systemu"


def main():
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == ADMIN_EMAIL).first()

        if existing_user:
            existing_user.employee_number = ADMIN_EMPLOYEE_NUMBER
            existing_user.first_name = ADMIN_FIRST_NAME
            existing_user.last_name = ADMIN_LAST_NAME
            existing_user.department = ADMIN_DEPARTMENT
            existing_user.role = ADMIN_ROLE
            existing_user.job_title = ADMIN_JOB_TITLE
            existing_user.hire_date = date.today()
            existing_user.password = hash_password(ADMIN_PASSWORD)
            existing_user.is_active = True
            existing_user.must_change_password = False

            db.commit()
            print("Admin zaktualizowany.")
        else:
            admin = User(
                employee_number=ADMIN_EMPLOYEE_NUMBER,
                first_name=ADMIN_FIRST_NAME,
                last_name=ADMIN_LAST_NAME,
                department=ADMIN_DEPARTMENT,
                role=ADMIN_ROLE,
                job_title=ADMIN_JOB_TITLE,
                manager_user_id=None,
                hire_date=date.today(),
                email=ADMIN_EMAIL,
                password=hash_password(ADMIN_PASSWORD),
                is_active=True,
                must_change_password=False,
            )

            db.add(admin)
            db.commit()
            print("Admin utworzony.")

        print(f"Email: {ADMIN_EMAIL}")
        print(f"Hasło: {ADMIN_PASSWORD}")
        print(f"Rola: {ADMIN_ROLE}")

    except Exception as e:
        db.rollback()
        print("Błąd podczas seedowania admina:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()