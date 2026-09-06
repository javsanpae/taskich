FROM python:3.11-alpine

WORKDIR /app

# Install required system packages
RUN apk add --no-cache gcc musl-dev linux-headers

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY database.py .
COPY templates/ templates/
COPY static/ static/

# Create database directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# Run application
CMD ["python", "app.py"]
