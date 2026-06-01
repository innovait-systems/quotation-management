# =========================================================================
# BUILD STAGE
# =========================================================================
FROM node:22-slim AS builder

WORKDIR /app

# Skip downloading Chrome binary during npm install post-install script in the build container
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install openssl for Prisma compatibility
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy packaging configuration files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma/

# Install dependencies using standard npm install to resolve lock file mismatches dynamically
RUN npm install

# Copy core source blueprints
COPY src ./src

# Generate the type-safe Prisma client & compile NestJS application
RUN npx prisma generate
RUN npm run build

# =========================================================================
# PRODUCTION RUNNER STAGE
# =========================================================================
FROM node:22-slim AS runner

WORKDIR /app

# Install system dependencies for Puppeteer (headless Chromium and system fonts)
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-ipafont-gothic \
  fonts-wqy-zenhei \
  fonts-thai-tlwg \
  fonts-kacst \
  fonts-freefont-ttf \
  libxss1 \
  openssl \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer environment coordinates to reference container system binary
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# Copy output compiled assets from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Make sure server port is accessible
EXPOSE 3001

# Boot NestJS application server
CMD ["node", "dist/src/main.js"]
