"""Main API router that includes all sub-routers."""
from fastapi import APIRouter
from app.api import users, memberships, user_memberships, recommendations, check, llm

api_router = APIRouter()

api_router.include_router(users.router)
api_router.include_router(memberships.router)
api_router.include_router(user_memberships.router)
api_router.include_router(recommendations.router)
api_router.include_router(check.router)
api_router.include_router(llm.router)

