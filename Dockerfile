FROM python:3.12-slim

# Install system dependencies (git is required for cloning target repositories)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy requirements and install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend source code
COPY backend/ .

# Expose port 7860 (Hugging Face Spaces default container port)
EXPOSE 7860

# Run FastAPI using uvicorn (binds to $PORT on Render, defaults to 7860 on Hugging Face Spaces)
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
