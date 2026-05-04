FROM python:3.12-slim

# Copy uv binary from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Set working directory
WORKDIR /app

# Ensure we use bash
SHELL ["/bin/bash", "-c"]

# Copy dependency files first to leverage Docker cache
COPY pyproject.toml uv.lock ./

# Install dependencies into the local .venv directory managed by uv
RUN uv sync --frozen --no-install-project

# Copy the rest of the application
COPY . .

# Final sync to include project files
RUN uv sync --frozen

EXPOSE 8000

# Start Uvicorn with hot-reload enabled via uv run
CMD ["uv", "run", "main.py"]
