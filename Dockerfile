FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json ./
RUN npm install

COPY . .
RUN npx tsc -p tsconfig.json

FROM node:20-slim AS runner
WORKDIR /app

# Chromium + fonts for puppeteer headless PDF generation.
# node:20-slim is Debian-based so we use apt.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        chromium \
        fonts-liberation \
        fonts-noto \
        ca-certificates \
        libgbm1 \
        libnss3 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Tell puppeteer to use the system Chromium rather than downloading its own.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
# Copy the HTML template so it is available at runtime
COPY pdf_template ./pdf_template

EXPOSE 8080
CMD ["node", "dist/index.js"]
