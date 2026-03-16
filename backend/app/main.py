from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import reconcile, validate

app = FastAPI(
    title="Clinical Data Reconciliation Engine",
    description="AI-powered reconciliation of conflicting clinical records",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reconcile.router, tags=["Reconciliation"])
app.include_router(validate.router, tags=["Data Quality"])


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}
