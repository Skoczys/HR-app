from database import SessionLocal
from models.user import User
from security import hash_password

ADMIN_EMAIL = "admin@hrapp.local"
ADMIN_PASSWORD = "Admin123!"
ADMIN_FULL_NAME = "Patryk Admin"
ADMIN_ROLE = "admin"


def main():
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == ADMIN_EMAIL).first()

        if existing_user:
            existing_user.full_name = ADMIN_FULL_NAME
            existing_user.password = hash_password(ADMIN_PASSWORD)
            existing_user.role = ADMIN_ROLE
            if hasattr(existing_user, "is_active"):
                existing_user.is_active = True
            db.commit()
            print("Admin zaktualizowany.")
        else:
            admin = User(
                full_name=ADMIN_FULL_NAME,
                email=ADMIN_EMAIL,
                password=hash_password(ADMIN_PASSWORD),
                role=ADMIN_ROLE,
            )
            if hasattr(admin, "is_active"):
                admin.is_active = True

            db.add(admin)
            db.commit()
            print("Admin utworzony.")

        print(f"Email: {ADMIN_EMAIL}")
        print(f"Hasło: {ADMIN_PASSWORD}")
        print(f"Rola: {ADMIN_ROLE}")

    finally:
        db.close()


if __name__ == "__main__":
    main()