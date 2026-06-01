# =========================================================================
# BUILD STAGE
# =========================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy packaging configuration blueprints
COPY package*.json ./

# Install clean node dependency tree via npm install
RUN npm install

# Copy the entire client directory (excluding files listed in .dockerignore)
COPY . .

# Inject build argument for active client static compilation
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Compile static page bundles
RUN npm run build

# =========================================================================
# RUNNER STAGE
# =========================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy runtime dependencies and compiled packages from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000

# Start production Next.js runner
CMD ["npm", "run", "start"]
