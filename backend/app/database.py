from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import get_settings

settings = get_settings()

# ---------------------------------------------------------
# DATABASE SETUP
# ---------------------------------------------------------

# Create the SQLAlchemy Engine. 
# This is the core interface that manages connections to our PostgreSQL/Supabase database.
# Note: For Supabase, ensure the DATABASE_URL starts with "postgresql://" 
# If it starts with "postgres://", SQLAlchemy might complain in newer versions.
db_url = settings.DATABASE_URL
if not db_url:
    raise ValueError(
        "DATABASE_URL environment variable is missing or empty! "
        "Please set the DATABASE_URL environment variable in your environment settings (e.g., Render Environment Variables)."
    )

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

db_url = settings.DATABASE_URL

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    connect_args={"sslmode": "require"},
)

# Create a SessionLocal class. 
# Each instance of this class will be an active database session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class for our models.
# All our database tables will inherit from this Base class so SQLAlchemy knows about them.
Base = declarative_base()

# Dependency function to get a Database session for our FastAPI routes.
# This pattern ensures a session is opened when a request comes in, 
# and it is safely closed when the request is done, even if an error occurs.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()