"""
Conveyor Stacking Control Service — Main Entry Point

Run with:
    uvicorn app.main:app --reload --port 8000

Swagger UI:
    http://localhost:8000/docs
"""

from fastapi import FastAPI

from app.routes import health, plc, stack, system


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="Conveyor Stacking Control Service",
        description="Local PC control service for PLC-based conveyor stacking system",
        version="1.0.0",
    )

    # Mount all route groups
    application.include_router(health.router, tags=["Health"])
    application.include_router(plc.router, tags=["PLC Control"])
    application.include_router(stack.router, tags=["Stack Management"])
    application.include_router(system.router, tags=["System Status"])

    return application


# Create the app instance
app = create_app()


@app.get("/")
def root():
    """Root endpoint — confirm service is running."""
    return {
        "service": "Conveyor Stacking Control Service",
        "version": "1.0.0",
        "docs": "/docs",
    }
