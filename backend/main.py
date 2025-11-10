"""VogPlus.app FastAPI application entry point."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router

app = FastAPI(
    title="VogPlus.app API",
    description="Membership Benefits Tracker",
    version="0.1.0"
)

# Configure CORS from environment variable
# Allow chrome-extension:// origins for browser extension
default_origins = "http://localhost:5173,http://localhost:3000,chrome-extension://"
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", default_origins)
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

# For chrome-extension origins, we need to use a regex pattern
# Chrome extensions have unique IDs, so we allow all chrome-extension:// origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|chrome-extension://.*",
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)


@app.get("/healthz")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "vogoplus-app-api",
        "version": "0.1.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

