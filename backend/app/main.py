from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router
from sqlalchemy.future import select
from app.models.chat import User
from app.core.security import get_password_hash
from app.core.database import AsyncSessionLocal

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Clean, modular FastAPI backend backend for LLM inference logging and analytics dashboard.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed for production security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("uvicorn.error")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )




async def init_admin_user():
    async with AsyncSessionLocal() as db:
        try:
            email = settings.ADMIN_EMAIL.strip().lower()
            result = await db.execute(select(User).where(User.email == email))
            admin = result.scalar_one_or_none()
            hashed_pwd = get_password_hash(settings.ADMIN_PASSWORD)
            
            if not admin:
                admin = User(
                    email=email,
                    hashed_password=hashed_pwd,
                    full_name="System Admin",
                    onboarded=True
                )
                db.add(admin)
                print(f"[Admin] Admin user '{email}' created successfully.")
            else:
                admin.hashed_password = hashed_pwd
                db.add(admin)
                print(f"[Admin] Admin user '{email}' credentials synchronized.")
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"[Warning] Failed to initialize admin user: {e}")

# Startup event
@app.on_event("startup")
async def startup_event():
    try:
        await init_db()
        print("Database tables initialized successfully.")
        await init_admin_user()
    except Exception as e:
        print(f"[Warning] Failed to initialize database: {e}")
        print("Continuing startup. Telemetry logging and DB writes will fail until a valid DATABASE_URL is configured.")

# Include v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}
