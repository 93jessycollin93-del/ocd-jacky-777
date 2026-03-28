# FastAPI Security Fixes — Reference Note

_Recorded: 2026-03-28_

Four critical issues identified in a Python FastAPI + SQLAlchemy project, with fixes.

---

## 1. Secret Exposure (High Risk)

**Problem:** Hardcoded Postgres connection string in `database.py`.

**Fix:** Use `python-dotenv` and pull credentials from environment variables.

```bash
pip install python-dotenv
```

`.env` (add to `.gitignore`):
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

`database.py`:
```python
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set")

engine = create_engine(DATABASE_URL)
```

---

## 2. Resource Management

**Problem:** Direct engine creation without explicit session scoping — risk of leaking DB connections under load.

**Fix:** Ensure `get_db` generator strictly closes sessions after every request.

```python
from sqlalchemy.orm import sessionmaker, Session

SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Every route uses `Depends(get_db)` — FastAPI handles the generator lifecycle automatically.

---

## 3. Direct Model Exposure

**Problem:** Routes returning SQLAlchemy models directly — risks leaking sensitive fields (e.g. `hashed_password`) and creates fragile API contracts.

**Fix:** Implement Pydantic schemas (DTOs) for request and response shapes.

```python
from pydantic import BaseModel

class UserOut(BaseModel):
    id: int
    email: str
    name: str

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
```

```python
@app.get("/users/{id}", response_model=UserOut)
def get_user(id: int, db: Session = Depends(get_db)):
    user = db.query(User).get(id)
    if not user:
        raise HTTPException(404)
    return user  # FastAPI filters through UserOut automatically
```

---

## 4. Performance — Async Blocking

**Problem:** Synchronous SQLAlchemy calls inside `async def` routes blocks the event loop.

**Fix (Option A — recommended):** Drop `async` from routes using synchronous SQLAlchemy. FastAPI auto-threads them:

```python
@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
```

**Fix (Option B — full async):** Switch to async SQLAlchemy + asyncpg:

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

engine = create_async_engine("postgresql+asyncpg://...")

async def get_db():
    async with AsyncSession(engine) as session:
        yield session
```

Option A is the right call unless hitting real concurrency bottlenecks.

---

## Priority Order

1. **Secrets** — fix today
2. **DTOs** — next
3. **Session scoping** and **async fix** — when hardening
