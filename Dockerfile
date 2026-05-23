# syntax = docker/dockerfile:1

# Dockerfile for LE-REMINDER web app
# Multi-stage build for optimal image size

# ============================================
# Stage 1: Dependencies
# ============================================
FROM oven/bun:1.3.14-debian AS deps

WORKDIR /app

# Copy workspace files for dependency resolution
COPY package.json bun.lockb ./
COPY apps/web/package.json apps/web/
COPY packages/*/package.json packages/

# Install dependencies
RUN bun install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM deps AS builder

WORKDIR /app

# Copy source code
COPY . .

# Build the web app
RUN bun run build

# ============================================
# Stage 3: Runner
# ============================================
FROM oven/bun:1.3.14-debian AS runner

WORKDIR /app

# Set production mode
ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/apps/web/.next/standalone ./.next/standalone/
COPY --from=builder /app/apps/web/.next/static ./.next/static/
COPY --from=builder /app/apps/web/public ./public/
COPY --from=builder /app/packages ./packages/
COPY --from=builder /app/node_modules/node_modules/better-auth ./node_modules/better-auth/

# Copy package.json for scripts
COPY package.json ./

# Expose port
EXPOSE 3001

# Start the application
CMD ["bun", "run", "apps/web/server.js"]