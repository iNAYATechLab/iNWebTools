# ==============================================================================
# iNWebTools — Multi-Stage Production Dockerfile
# Base: Node.js 22 LTS Alpine
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies & Build
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install build prerequisites
RUN apk add --no-cache python3 make g++

# Copy package descriptors
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all dependencies including devDependencies for compilation
RUN npm ci

# Copy full application source
COPY tsconfig.base.json eslint.config.js ./
COPY client/ ./client/
COPY server/ ./server/

# Build client production bundle
RUN npm --workspace @inwebtools/client run build

# Prune devDependencies for a lean runtime
RUN npm prune --production

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install runtime dependencies for healthchecks
RUN apk add --no-cache curl tzdata

# Security: run as non-root user
USER node

# Copy node_modules and production builds from builder
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/server ./server
COPY --chown=node:node --from=builder /app/client/dist ./client/dist

# Expose backend API port
EXPOSE 5000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "server/index.js"]
