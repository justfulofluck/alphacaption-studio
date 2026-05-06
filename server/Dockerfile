# Use official Python image as base
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Set environment variables (can be overridden by docker-compose)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Make script executable (just in case)
RUN chmod +x docker-entrypoint.sh

# Use entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]