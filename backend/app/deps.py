from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings, get_settings


@lru_cache
def get_engine() -> Engine:
    settings: Settings = get_settings()
    return create_engine(settings.database_url, pool_pre_ping=True)


def get_db() -> Generator[Session, None, None]:
    session_factory = sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)
    db = session_factory()
    try:
        yield db
    finally:
        db.close()
