FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json ./
RUN npm install

COPY . .
RUN npx tsc -p tsconfig.json

FROM node:20-slim AS runner
WORKDIR /app

# LibreOffice for DOCX → PDF conversion.
# node:20-slim is Debian-based — apt packages are more reliable than Alpine's
# and are what Render.com's build environment expects.
RUN apt-get update && \
    apt-get install -y --no-install-recommends libreoffice fonts-liberation && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
# Copy the DOCX template so it is available at runtime
COPY pdf_template ./pdf_template

EXPOSE 8080
CMD ["node", "dist/index.js"]
