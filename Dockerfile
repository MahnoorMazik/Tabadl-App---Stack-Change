# Stage 1: Builder (Debian-based to ensure native binaries like lightningcss and SWC work)
FROM node:22.13-bullseye-slim AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       curl \
       python3 \
       build-essential \
       openssl \
    && rm -rf /var/lib/apt/lists/*

RUN node -v
RUN npm -v 
RUN npm install -g pnpm@9.15.9

# Copy package files first (for better layer caching)
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Remove Windows-specific SWC package from package.json (not needed on Linux)
RUN sed -i '/"@next\/swc-win32-x64-msvc"/d' package.json || echo "Warning: Could not remove Windows SWC package (may not exist)"

# Install all dependencies (including dev dependencies for build)
# This layer is cached unless package.json or pnpm-lock.yaml changes
RUN pnpm install --no-frozen-lockfile

# Copy source code (this layer invalidates only when source changes)
COPY . .

# Build args for Next.js public env vars (baked in at build time)
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER=true

# Set app version and VAPID public key for Next.js build (NEXT_PUBLIC_* vars are inlined at build time)
RUN APP_VERSION=$(node -pe "require('./package.json').version") && \
    if [ -z "$APP_VERSION" ]; then \
        echo "ERROR: Failed to read version from package.json" && exit 1; \
    fi && \
    echo "Building with APP_VERSION: $APP_VERSION" && \
    echo "NEXT_PUBLIC_APP_VERSION=$APP_VERSION" > .env.production && \
    [ -n "$NEXT_PUBLIC_VAPID_PUBLIC_KEY" ] && echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY" >> .env.production || true && \
    echo "Created .env.production" && \
    cat .env.production


# Generate Prisma Client if schema exists
# Fail if Prisma schema exists but generation fails
RUN if [ -f "prisma/schema.prisma" ]; then \
        echo "Prisma schema found, generating client..."; \
        pnpm exec prisma generate || (echo "ERROR: Prisma client generation failed!" && exit 1); \
    else \
        echo "ERROR: Prisma schema not found at prisma/schema.prisma!" && exit 1; \
    fi

# Build Next.js application - fail immediately on build errors
RUN pnpm run build || (echo "ERROR: Next.js build failed!" && exit 1)

# Note: Skipping pnpm prune due to peer dependency resolver conflicts during prune.
# If image size becomes a concern, we can switch to a two-pass install:
#   1) build with full deps, 2) re-install prod deps into a clean dir and copy.

# Stage 2: Runner (Debian-based)
FROM node:22.13-bullseye-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV DOCKER=true

# Install runtime dependencies and enable pnpm
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       dumb-init \
       curl \
       ca-certificates \
       openssl \
       tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@9.15.9

# Set timezone (adjust as needed)
ENV TZ=UTC

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files with proper ownership
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/server.ts ./server.ts
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/eslint.config.mjs ./eslint.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/components.json ./components.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy environment example file
COPY --from=builder --chown=nextjs:nodejs /app/env.production.example ./env.production.example

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create directories for data persistence with proper permissions
# Note: prisma/db is created by entrypoint, but we create placeholder here
# Create upload subdirectories BEFORE switching user so they have correct permissions
RUN mkdir -p prisma/db uploads logs uploads/applications uploads/leads && \
    chown -R nextjs:nodejs prisma/db uploads logs && \
    chmod -R 755 uploads && \
    chmod -R 755 prisma/db

# Switch to non-root user
USER nextjs

EXPOSE 2006

ENV PORT=2006
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:2006/api/health || exit 1

# Use entrypoint script to initialize database and start application
ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
