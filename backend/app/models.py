import uuid
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
from app.database import Base

# ---------------------------------------------------------
# DATABASE MODELS
# ---------------------------------------------------------

class RepositoryFile(Base):
    """
    This defines the schema for our 'repository_files' table in PostgreSQL.
    It inherits from the Base we created in database.py.
    This single table holds everything from raw code to LLM summaries and vector embeddings.
    """
    __tablename__ = "repository_files"

    # We use UUIDs instead of auto-incrementing integers for primary keys.
    # This is safer for distributed systems and prevents ID guessing.
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Information about where the file came from
    # E.g., repo_url = "https://github.com/user/repo", file_path = "src/main.py"
    # We index both so we can quickly query "Give me all files for this repo"
    repo_url = Column(String, index=True, nullable=False)
    file_path = Column(String, index=True, nullable=False)
    
    # The actual raw code of the file. Stored as Text because files can be long.
    content = Column(Text, nullable=True)
    
    # Our simple static analysis output (e.g. "Python", "JavaScript")
    language = Column(String, nullable=True)
    
    # JSONB is a special PostgreSQL data type that stores JSON efficiently.
    # We use this to store the structured output from our Map Worker LLM.
    # It allows us to easily query keys inside the JSON later if needed.
    explanation_summary = Column(JSONB, nullable=True)
    vulnerabilities_found = Column(JSONB, nullable=True)
    
    # The pgvector extension column for our RAG search.
    # We set the dimension to 768, which is the standard size for Gemini embedding models.
    # (e.g., models/text-embedding-004 outputs 768 dimensions).
    embedding = Column(Vector(3072), nullable=True)
    
    # Status tracking for our background async workers (The Map Phase)
    # Possible values: "pending", "processing", "completed", "error", "skipped"
    # This is crucial so we know when a repository has finished processing.
    status = Column(String, default="pending", index=True)

    # The owner UID of the user who scanned this repository (Firebase UID)
    user_id = Column(String, default="mock_local_developer_uid", index=True)

    # Ingestion timestamp used for rate-limiting
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class UserMapping(Base):
    """
    Persistent mapping of Firebase UIDs to user emails, stored in PostgreSQL.
    This ensures email resolution remains persistent across deployments,
    restarts, and container replacements.
    """
    __tablename__ = "user_mappings"

    uid = Column(String, primary_key=True, index=True)
    email = Column(String, nullable=False)


