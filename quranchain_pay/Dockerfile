# ═══════════════════════════════════════════════════════════════════════════════
# QuranChain Pay™ - Production Dockerfile
# © QuranChain™ | Omar Mohammad Abunadi™
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim-bookworm

LABEL maintainer="Omar Mohammad Abunadi"
LABEL description="QuranChain Pay - Production Payment Orchestration"
LABEL copyright="© QuranChain™ | Omar Mohammad Abunadi™"

# Security: Run as non-root user
RUN groupadd -r quranchain && useradd -r -g quranchain quranchain

# Set environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for layer caching)
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy application code
COPY app/ ./app/

# Change ownership
RUN chown -R quranchain:quranchain /app

# Switch to non-root user
USER quranchain

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run with gunicorn
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8080", "--access-logfile", "-", "--error-logfile", "-"]
