# Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-bookworm-slim AS runner
WORKDIR /usr/src/app

# Install LibreOffice, Ghostscript, and basic fonts
RUN apt-get update && apt-get install -y \
    libreoffice \
    ghostscript \
    fontconfig \
    fonts-dejavu-core \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

# Copy compiled files from builder
COPY --from=builder /usr/src/app/dist ./dist
# Create uploads directory
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=5000
ENV LIBREOFFICE_PATH=libreoffice
ENV GHOSTSCRIPT_PATH=gs

EXPOSE 5000

CMD ["npm", "start"]
