# Backend Dockerfile for HopOn
# Builds a compact image running gunicorn for the Flask app
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml ./
COPY app.py ./
COPY models.py ./
# Copy everything else from the backend context
COPY . ./


# Install all Python dependencies from pyproject.toml (including psycopg2 and gunicorn)
RUN pip install --upgrade pip setuptools
RUN pip install .

# Expose port
EXPOSE 8000

# Use a sensible default command for production
CMD ["python", "app.py"]
