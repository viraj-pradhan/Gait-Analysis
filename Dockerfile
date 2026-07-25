FROM python:3.10-slim

# Install Node.js 20, ffmpeg, and OS libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    ffmpeg \
    libsm6 \
    libxext6 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements & install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy package files & install frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy entire codebase
COPY . .

# Build Next.js production bundle
RUN cd frontend && npm run build

# Make scripts executable
RUN chmod +x start.sh

EXPOSE 10000

ENV PORT=10000

CMD ["./start.sh"]
