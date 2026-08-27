import os
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, select

from models import VIPCustomer

logger = logging.getLogger("mind_anchor.database")

# DATABASE_URL이 명시되어 있으면 PostgreSQL 사용, 그렇지 않으면 SQLite 기본 사용
ENV_DB_URL = os.getenv("DATABASE_URL")

if ENV_DB_URL:
    DATABASE_URL = ENV_DB_URL
else:
    DATABASE_URL = "sqlite+aiosqlite:///./mind_anchor.db"

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Async DB 세션 의존성 구하기"""
    async with async_session_maker() as session:
        yield session


async def init_db():
    """테이블 자동 생성 및 시드 데이터 (VIP 고객 3명) 세팅"""
    global engine, async_session_maker
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    except Exception as e:
        logger.warning(f"DB 연결 중 예외 발생 ({e}). SQLite 폴백 DB를 활성화합니다.")
        DATABASE_URL = "sqlite+aiosqlite:///./mind_anchor.db"
        engine = create_async_engine(DATABASE_URL, echo=False, future=True)
        async_session_maker = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

    # 초기 VIP 고객 시드 데이터 자동 등록
    async with async_session_maker() as session:
        statement = select(VIPCustomer)
        result = await session.execute(statement)
        existing_customers = result.scalars().all()
        
        if not existing_customers:
            seed_customers = [
                VIPCustomer(
                    customer_id=1,
                    name="김순자",
                    age=81,
                    risk_level="HIGH",
                    phone="010-3849-2041"
                ),
                VIPCustomer(
                    customer_id=2,
                    name="박종수",
                    age=76,
                    risk_level="MEDIUM",
                    phone="010-8271-9304"
                ),
                VIPCustomer(
                    customer_id=3,
                    name="이영희",
                    age=79,
                    risk_level="LOW",
                    phone="010-5612-4019"
                )
            ]
            session.add_all(seed_customers)
            await session.commit()
            logger.info("초기 VIP 고객 3명 시드 데이터 삽입 완료.")

