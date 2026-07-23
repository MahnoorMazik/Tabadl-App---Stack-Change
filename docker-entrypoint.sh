#!/bin/sh
set -e

# Logging helper
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1" >&2
}

# Check if database has users (is seeded)
db_has_users() {
    node -e "
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const timeout = setTimeout(() => {
                prisma.\$disconnect();
            process.exit(1);
        }, 10000);
            prisma.user.count().then(count => {
                clearTimeout(timeout);
            console.log(count > 0 ? 'yes' : 'no');
                prisma.\$disconnect();
            }).catch((err) => {
                clearTimeout(timeout);
            console.error('Database check error:', err.message);
            console.log('no');
                prisma.\$disconnect();
                process.exit(0);
            });
    " 2>&1 | grep -q "yes"
}

# Initialize database (run migrations, seed if empty)
init_database() {
    log "🔧 Initializing database..."

    mkdir -p /app/prisma/db /app/uploads/applications /app/uploads/leads /app/logs

    log "📊 Applying migrations..."
    pnpm exec prisma migrate deploy || {
        log_error "Migration failed."
        exit 1
    }

    if db_has_users; then
        log "✅ Database has existing data"
    else
        log "🌱 Seeding fresh database..."
        [ -f "/app/prisma/seed.ts" ] || handle_error "Seed file not found at /app/prisma/seed.ts"
        pnpm exec tsx prisma/seed.ts || handle_error "Database seeding failed"
        db_has_users || handle_error "Database seeding failed - no users created"
        log "✅ Database seeded successfully"
    fi

    log "✅ Database ready"
}

# Start application
start_app() {
    log "🚀 Starting application..."

    if [ ! -w "/app/uploads" ]; then
        log_error "Uploads directory not writable!"
        CURRENT_OWNER=$(stat -c "%U:%G (%u:%g)" /app/uploads 2>/dev/null || echo "unknown")
        log_error "Current owner: $CURRENT_OWNER"
        log_error "FIX ON HOST: sudo mkdir -p uploads/applications uploads/leads && sudo chown -R 1001:1001 uploads && sudo chmod -R 755 uploads"
        exit 1
    fi

    mkdir -p /app/uploads/applications /app/uploads/leads 2>/dev/null || {
        log_error "Could not create upload subdirectories!"
        exit 1
    }

    [ -f "/app/server.ts" ] || handle_error "server.ts not found"
    [ -n "$JWT_SECRET" ] && [ "$JWT_SECRET" != "your-secret-key-change-in-production" ] || \
        log "⚠️  Warning: Using default JWT_SECRET. Change in production!"

    exec pnpm exec tsx server.ts
}

handle_error() {
    log_error "$1"
    exit 1
}

# Main execution
log "🚀 Starting Tabadl Alkon CRM..."

[ -f "/app/prisma/schema.prisma" ] || handle_error "Prisma schema not found"
log "🔧 Generating Prisma Client..."
pnpm exec prisma generate || handle_error "Prisma Client generation failed"

init_database
start_app
