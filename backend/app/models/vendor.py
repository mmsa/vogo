from sqlalchemy import Column, Integer, String
from app.core.db import Base


class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    domain = Column(String, unique=True, index=True, nullable=False)

