from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext


# -----------------------
# USTAWIENIA JWT
# -----------------------

# klucz do podpisywania tokenów
# później przeniesiemy go do pliku .env
SECRET_KEY = "zmienimy_to_pozniej_na_porządny_sekret"

# algorytm podpisu tokena
ALGORITHM = "HS256"

# czas ważności tokena w minutach
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# -----------------------
# HASHOWANIE HASEL
# -----------------------

# konfiguracja algorytmu do hashowania haseł
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


# -----------------------
# OAUTH2 / TOKEN
# -----------------------

# konfiguracja mechanizmu pobierania tokena z nagłówka Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# -----------------------
# HASLA
# -----------------------

# zamiana zwykłego hasła na hash
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# porównanie zwykłego hasła z hashem zapisanym w bazie
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# -----------------------
# TOKEN JWT
# -----------------------

# tworzenie tokena dostępu na podstawie danych użytkownika
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# -----------------------
# AKTUALNY UZYTKOWNIK
# -----------------------

# odczyt danych użytkownika z tokena JWT
# funkcja jest używana do zabezpieczania endpointów
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Nieprawidłowy token")

        return payload

    except JWTError:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")