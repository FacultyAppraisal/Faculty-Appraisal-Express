FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json ./
RUN npm install

COPY . .
RUN npx tsc -p tsconfig.json

FROM node:20-alpine AS runner
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]
