#!/bin/bash
set -e

# ============================================================================
# Deployment Script for Tabadl Alkon CRM (new style – single folder)
# Run from the app folder (or from a folder that has deploy.sh + deployment/).
# No copy to main-project: Docker runs from APP_DIR. Build first, then down/up.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# App directory: same as script dir if Dockerfile is here, else deployment/ subfolder (from tk-deployment.zip)
if [ -f "$SCRIPT_DIR/Dockerfile" ] && [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    APP_DIR="$SCRIPT_DIR"
elif [ -d "$SCRIPT_DIR/deployment" ] && [ -f "$SCRIPT_DIR/deployment/Dockerfile" ] && [ -f "$SCRIPT_DIR/deployment/docker-compose.yml" ]; then
    APP_DIR="$SCRIPT_DIR/deployment"
else
    APP_DIR=""
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (warn but allow)
if [ "$EUID" -eq 0 ]; then 
    print_warn "⚠️  Running as root. This is not recommended but will proceed."
    print_warn "   For better security, run as regular user and use sudo when prompted."
fi

# Check prerequisites
print_info "Checking prerequisites..."
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
if ! docker info >/dev/null 2>&1; then
    print_error "Docker daemon is not running or not accessible. Please start Docker."
    exit 1
fi

# Detect Docker Compose command
if command -v docker compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Show versions for debugging
DOCKER_VERSION=$(docker --version 2>&1 || echo "unknown")
COMPOSE_VERSION=$($DOCKER_COMPOSE_CMD version 2>&1 || echo "unknown")
print_info "Docker: $DOCKER_VERSION"
print_info "Docker Compose: $COMPOSE_VERSION"

# Check for required commands (tar for backup)
for cmd in tar; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        print_warn "⚠️  $cmd not found - backup may fail"
    fi
done

# ============================================================================
# Step 1: Determine app directory and validate
# ============================================================================
if [ -z "$APP_DIR" ]; then
    print_error "❌ App directory not found"
    print_error "   Put deploy.sh in the app root (with Dockerfile, docker-compose.yml), or unzip tk-deployment.zip (deploy.sh + deployment/)."
    exit 1
fi

print_info "Starting Tabadl Alkon CRM deployment (new style – single folder)..."
print_info "App directory: $APP_DIR"
print_info "Script location: $SCRIPT_DIR"

REQUIRED_FILES=("Dockerfile" "docker-compose.yml" "docker-entrypoint.sh" "package.json" "env.production.example" "server.ts")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$APP_DIR/$file" ]; then
        print_error "❌ Required file missing: $APP_DIR/$file"
        exit 1
    fi
done
if [ ! -f "$APP_DIR/prisma/schema.prisma" ]; then
    print_error "❌ Prisma schema not found: $APP_DIR/prisma/schema.prisma"
    exit 1
fi
print_info "✅ All required files present"

# ============================================================================
# Step 2: Detect deployment mode (first vs update)
# ============================================================================
ENV_FILE="$APP_DIR/.env"
IS_FIRST_DEPLOYMENT=false

if [ ! -f "$ENV_FILE" ]; then
    IS_FIRST_DEPLOYMENT=true
    print_info "🔍 First deployment (no .env in app directory)"
else
    print_info "🔍 Update deployment (existing .env found)"
fi

# ============================================================================
# Step 3: Backup persistent data (update mode only)
# ============================================================================
if [ "$IS_FIRST_DEPLOYMENT" = "false" ]; then
    BACKUP_ROOT="$APP_DIR/backups"
    TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
    BACKUP_ARCHIVE="$BACKUP_ROOT/persistent-$TIMESTAMP.tar.gz"
    
    print_info "Creating backup of persistent data..."
    mkdir -p "$BACKUP_ROOT"
    
    PERSIST_PATHS=()
    TOTAL_SIZE=0
    for path in .env prisma/db uploads logs; do
        FULL_PATH="$APP_DIR/$path"
        if [ -e "$FULL_PATH" ]; then
            PERSIST_PATHS+=("$path")
            if [ -f "$FULL_PATH" ]; then
                SIZE=$(stat -f%z "$FULL_PATH" 2>/dev/null || stat -c%s "$FULL_PATH" 2>/dev/null || echo 0)
            elif [ -d "$FULL_PATH" ]; then
                SIZE=$(du -sk "$FULL_PATH" 2>/dev/null | cut -f1 || echo 0)
                SIZE=$((SIZE * 1024))
            else
                SIZE=0
            fi
            TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
            SIZE_MB=$((SIZE / 1024 / 1024))
            print_info "   📦 $path ($SIZE_MB MB)"
        fi
    done
    
    if [ ${#PERSIST_PATHS[@]} -gt 0 ]; then
        TOTAL_MB=$((TOTAL_SIZE / 1024 / 1024))
        print_info "   Total size to backup: $TOTAL_MB MB"
        BACKUP_OUTPUT=$(tar -czf "$BACKUP_ARCHIVE" -C "$APP_DIR" "${PERSIST_PATHS[@]}" 2>&1)
        BACKUP_EXIT=$?
        if [ $BACKUP_EXIT -eq 0 ]; then
            BACKUP_SIZE=$(stat -f%z "$BACKUP_ARCHIVE" 2>/dev/null || stat -c%s "$BACKUP_ARCHIVE" 2>/dev/null || echo "unknown")
            BACKUP_SIZE_MB=$((BACKUP_SIZE / 1024 / 1024))
            print_info "✅ Backup saved: $(basename "$BACKUP_ARCHIVE") ($BACKUP_SIZE_MB MB)"
        else
            print_error "❌ Backup creation failed! $BACKUP_OUTPUT"
            exit 1
        fi
    else
        print_warn "⚠️  No persistent data found to backup"
    fi
fi

# ============================================================================
# Step 4: Configure environment (.env)
# ============================================================================
cd "$APP_DIR"

# Prompt for application URL
print_info "Configuring application URL..."
DEFAULT_APP_URL="https://staging.tk.sa"
read -p "Enter application URL [${DEFAULT_APP_URL}]: " APP_URL
APP_URL=${APP_URL:-$DEFAULT_APP_URL}

# Normalize URL
if [[ ! "$APP_URL" =~ ^https?:// ]]; then
    APP_URL="https://${APP_URL}"
fi
APP_URL=$(echo "$APP_URL" | sed 's|/$||')

# Extract components
if [[ "$APP_URL" =~ ^(https?)://(.+)$ ]]; then
    APP_PROTOCOL="${BASH_REMATCH[1]}"
    APP_DOMAIN="${BASH_REMATCH[2]}"
else
    print_error "Invalid URL format: $APP_URL"
    exit 1
fi

# Determine WebSocket protocol
if [ "$APP_PROTOCOL" = "https" ]; then
    WS_PROTOCOL="wss"
else
    WS_PROTOCOL="ws"
fi

WS_URL="${WS_PROTOCOL}://${APP_DOMAIN}"
print_info "Application URL: $APP_URL"
print_info "WebSocket URL: $WS_URL"
print_info "Domain: $APP_DOMAIN"

# Create or update .env
if [ ! -f ".env" ]; then
    print_info "Creating .env file from example..."
    if [ ! -f "env.production.example" ]; then
        print_error "env.production.example not found!"
        exit 1
    fi
    
    # Generate secure JWT_SECRET
    if command -v openssl >/dev/null 2>&1; then
        JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')
    elif [ -c /dev/urandom ]; then
        JWT_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 40 | head -n 1)
    else
        print_error "Cannot generate secure JWT_SECRET: openssl not found and /dev/urandom not available"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
        print_error "Failed to generate secure JWT_SECRET"
        exit 1
    fi
    
    # Get version from package.json
    print_info "   Reading version from package.json..."
    APP_VERSION=$(node -pe "require('./package.json').version" 2>/dev/null || echo "1.0.0")
    print_info "   App version: $APP_VERSION"
    
    # Create .env
    print_info "   Copying env.production.example to .env..."
    if ! cp env.production.example .env 2>/dev/null; then
        print_error "❌ Failed to copy env.production.example to .env"
        print_error "   Source: $(pwd)/env.production.example"
        print_error "   Target: $(pwd)/.env"
        exit 1
    fi
    
    # Update .env with generated values
    print_info "   Updating .env with generated values..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$APP_URL|" .env
        sed -i '' "s|NEXT_PUBLIC_WS_URL=.*|NEXT_PUBLIC_WS_URL=$WS_URL|" .env
        sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$APP_URL|" .env
        sed -i '' "s|NEXT_PUBLIC_APP_DOMAIN=.*|NEXT_PUBLIC_APP_DOMAIN=$APP_DOMAIN|" .env
        sed -i '' "s|AUTH_URL=.*|AUTH_URL=$APP_URL|" .env
        sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=$APP_URL|" .env
        sed -i '' "s|NEXT_PUBLIC_APP_VERSION=.*|NEXT_PUBLIC_APP_VERSION=$APP_VERSION|" .env 2>/dev/null || \
            echo "NEXT_PUBLIC_APP_VERSION=$APP_VERSION" >> .env
    else
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$APP_URL|" .env
        sed -i "s|NEXT_PUBLIC_WS_URL=.*|NEXT_PUBLIC_WS_URL=$WS_URL|" .env
        sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$APP_URL|" .env
        sed -i "s|NEXT_PUBLIC_APP_DOMAIN=.*|NEXT_PUBLIC_APP_DOMAIN=$APP_DOMAIN|" .env
        sed -i "s|AUTH_URL=.*|AUTH_URL=$APP_URL|" .env
        sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=$APP_URL|" .env
        sed -i "s|NEXT_PUBLIC_APP_VERSION=.*|NEXT_PUBLIC_APP_VERSION=$APP_VERSION|" .env 2>/dev/null || \
            echo "NEXT_PUBLIC_APP_VERSION=$APP_VERSION" >> .env
    fi
    
    # Generate VAPID keys for push notifications (requires pnpm install)
    print_info "   Generating VAPID keys for push notifications..."
    if pnpm install --frozen-lockfile 2>/dev/null || pnpm install 2>/dev/null; then
        VAPID_OUTPUT=$(node -e "
            try {
                const wp = require('web-push');
                const k = wp.generateVAPIDKeys();
                console.log(k.publicKey);
                console.log(k.privateKey);
            } catch (e) { process.exit(1); }
        " 2>/dev/null) || true
        if [ -n "$VAPID_OUTPUT" ]; then
            VAPID_PUBLIC=$(echo "$VAPID_OUTPUT" | head -1)
            VAPID_PRIVATE=$(echo "$VAPID_OUTPUT" | tail -1)
            if [ -n "$VAPID_PUBLIC" ] && [ -n "$VAPID_PRIVATE" ]; then
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*|NEXT_PUBLIC_VAPID_PUBLIC_KEY=$VAPID_PUBLIC|" .env
                    sed -i '' "s|VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$VAPID_PRIVATE|" .env
                else
                    sed -i "s|NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*|NEXT_PUBLIC_VAPID_PUBLIC_KEY=$VAPID_PUBLIC|" .env
                    sed -i "s|VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$VAPID_PRIVATE|" .env
                fi
                print_info "   ✅ Generated VAPID keys for push notifications"
            else
                print_warn "   ⚠️  VAPID generation produced empty keys"
            fi
        else
            print_warn "   ⚠️  VAPID key generation failed - push notifications will not work until you run: pnpm run add:vapid"
        fi
    else
        print_warn "   ⚠️  Could not install dependencies for VAPID generation - push notifications will not work"
        print_warn "      After deploy, run in main-project: pnpm install && pnpm run add:vapid"
    fi

    # Verify critical values were set
    if ! grep -q "^JWT_SECRET=$JWT_SECRET" .env; then
        print_warn "   ⚠️  Warning: JWT_SECRET may not have been set correctly"
    fi
    
    # Verify .env was created
    if [ ! -f ".env" ]; then
        print_error "❌ .env file was not created!"
        exit 1
    fi
    
    ENV_SIZE=$(stat -f%z ".env" 2>/dev/null || stat -c%s ".env" 2>/dev/null || echo "unknown")
    print_info "✅ .env file created with production URLs ($ENV_SIZE bytes)"
    print_info "   Generated JWT_SECRET: ${JWT_SECRET:0:20}... (hidden for security)"
else
    print_info "✅ .env file already exists (preserved)"
    
    # Check if VAPID keys are placeholders - generate if needed for push notifications
    VAPID_PUBLIC_CURRENT=$(grep "^NEXT_PUBLIC_VAPID_PUBLIC_KEY=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "")
    if [ -z "$VAPID_PUBLIC_CURRENT" ] || [ "$VAPID_PUBLIC_CURRENT" = "your-vapid-public-key-here" ] || [[ "$VAPID_PUBLIC_CURRENT" == *"your-vapid"* ]]; then
        print_info "VAPID keys are not configured - generating for push notifications..."
        if pnpm install --frozen-lockfile 2>/dev/null || pnpm install 2>/dev/null; then
            VAPID_OUTPUT=$(node -e "
                try {
                    const wp = require('web-push');
                    const k = wp.generateVAPIDKeys();
                    console.log(k.publicKey);
                    console.log(k.privateKey);
                } catch (e) { process.exit(1); }
            " 2>/dev/null) || true
            if [ -n "$VAPID_OUTPUT" ]; then
                VAPID_PUBLIC=$(echo "$VAPID_OUTPUT" | head -1)
                VAPID_PRIVATE=$(echo "$VAPID_OUTPUT" | tail -1)
                if [ -n "$VAPID_PUBLIC" ] && [ -n "$VAPID_PRIVATE" ]; then
                    if [[ "$OSTYPE" == "darwin"* ]]; then
                        sed -i '' "s|NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*|NEXT_PUBLIC_VAPID_PUBLIC_KEY=$VAPID_PUBLIC|" .env
                        sed -i '' "s|VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$VAPID_PRIVATE|" .env
                    else
                        sed -i "s|NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*|NEXT_PUBLIC_VAPID_PUBLIC_KEY=$VAPID_PUBLIC|" .env
                        sed -i "s|VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$VAPID_PRIVATE|" .env
                    fi
                    print_info "   ✅ Generated VAPID keys - push notifications will work after rebuild"
                fi
            fi
        else
            print_warn "   ⚠️  Run 'pnpm run add:vapid' in main-project and rebuild to enable push notifications"
        fi
    fi
    
    # Update URLs and DATABASE_URL in existing .env (preserve JWT_SECRET)
    print_info "Updating URLs and DATABASE_URL in existing .env file..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=file:./db/custom.db|" .env
        sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$APP_URL|" .env
        sed -i '' "s|NEXT_PUBLIC_WS_URL=.*|NEXT_PUBLIC_WS_URL=$WS_URL|" .env
        sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$APP_URL|" .env
        sed -i '' "s|NEXT_PUBLIC_APP_DOMAIN=.*|NEXT_PUBLIC_APP_DOMAIN=$APP_DOMAIN|" .env
        sed -i '' "s|AUTH_URL=.*|AUTH_URL=$APP_URL|" .env
        sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=$APP_URL|" .env
    else
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=file:./db/custom.db|" .env
        sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$APP_URL|" .env
        sed -i "s|NEXT_PUBLIC_WS_URL=.*|NEXT_PUBLIC_WS_URL=$WS_URL|" .env
        sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$APP_URL|" .env
        sed -i "s|NEXT_PUBLIC_APP_DOMAIN=.*|NEXT_PUBLIC_APP_DOMAIN=$APP_DOMAIN|" .env
        sed -i "s|AUTH_URL=.*|AUTH_URL=$APP_URL|" .env
        sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=$APP_URL|" .env
    fi
    # Ensure DATABASE_URL exists (if it was missing, sed above won't add it)
    if ! grep -q "^DATABASE_URL=" .env 2>/dev/null; then
        echo "DATABASE_URL=file:./db/custom.db" >> .env
        print_info "   Added DATABASE_URL=file:./db/custom.db to .env"
    fi
    print_info "✅ URLs and DATABASE_URL updated in .env file"
    
    # Validate JWT_SECRET
    JWT_SECRET_VALUE=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "")
    if [ -n "$JWT_SECRET_VALUE" ]; then
        if [ ${#JWT_SECRET_VALUE} -lt 32 ]; then
            print_warn "⚠️  JWT_SECRET is too short (${#JWT_SECRET_VALUE} chars, minimum 32 recommended)"
        fi
        if [ "$JWT_SECRET_VALUE" = "your-secret-key-change-in-production" ] || [ "$JWT_SECRET_VALUE" = "YOUR_GENERATED_SECRET_HERE_MIN_40_CHARACTERS" ]; then
            print_error "❌ JWT_SECRET is using default value! Please generate a secure secret."
            exit 1
        fi
    fi
fi

# ============================================================================
# Step 5: Verify docker-compose.yml
# ============================================================================
print_info "Validating docker-compose.yml..."
if [ ! -f "docker-compose.yml" ]; then
    print_error "❌ docker-compose.yml not found in $APP_DIR"
    exit 1
fi

# Check if docker-compose can parse the file
VALIDATE_OUTPUT=$($DOCKER_COMPOSE_CMD config 2>&1)
VALIDATE_EXIT=$?
if [ $VALIDATE_EXIT -ne 0 ]; then
    print_error "❌ docker-compose.yml is invalid!"
    print_error "   Exit code: $VALIDATE_EXIT"
    print_error "   Error output:"
    echo "$VALIDATE_OUTPUT" | while read line; do
        print_error "     $line"
    done
    exit 1
fi
print_info "   ✅ docker-compose.yml is valid"

# ============================================================================
# Step 6: Setup directories and permissions
# ============================================================================
print_info "Creating required directories..."
for dir in prisma/db uploads/applications uploads/leads logs; do
    if mkdir -p "$dir" 2>/dev/null; then
        print_info "   ✅ Created: $dir"
    else
        print_error "   ❌ Failed to create: $dir"
        exit 1
    fi
done

# Set permissions
print_info "Setting directory permissions..."
if chown -R 1001:1001 prisma/db 2>/dev/null; then
    print_info "   ✅ Set ownership on prisma/db to 1001:1001"
else
    if sudo chown -R 1001:1001 prisma/db 2>/dev/null; then
        print_info "   ✅ Set ownership on prisma/db (sudo)"
    else
        print_warn "   ⚠️  prisma/db ownership setting failed (may cause issues)"
    fi
fi
if chmod 755 prisma/db logs 2>/dev/null; then
    print_info "   ✅ Set permissions on prisma/db and logs"
else
    if sudo chmod 755 prisma/db logs 2>/dev/null; then
        print_info "   ✅ Set permissions on prisma/db and logs (sudo)"
    else
        print_warn "   ⚠️  Permission setting failed (may cause issues)"
    fi
fi

# Setup uploads directory permissions
print_info "Setting up uploads directory permissions..."
UPLOADS_FIXED=false

if [ -f "init-uploads.sh" ]; then
    chmod +x init-uploads.sh
    if sudo ./init-uploads.sh 2>&1; then
        UPLOADS_FIXED=true
        print_info "✅ Uploads directory configured via init-uploads.sh"
    fi
fi

if [ "$UPLOADS_FIXED" = "false" ]; then
    if sudo chown -R 1001:1001 uploads 2>&1 && sudo chmod -R 755 uploads 2>&1; then
        UPLOADS_FIXED=true
        print_info "✅ Uploads directory configured"
    fi
fi

if [ "$UPLOADS_FIXED" = "true" ]; then
    CURRENT_OWNER=$(stat -c "%u:%g" uploads 2>/dev/null || stat -f "%u:%g" uploads 2>/dev/null || echo "unknown")
    if [ "$CURRENT_OWNER" = "1001:1001" ]; then
        print_info "✅ Verified: uploads owned by 1001:1001"
    else
        print_warn "⚠️  Warning: uploads ownership is $CURRENT_OWNER (expected 1001:1001)"
    fi
else
    print_error "❌ FAILED to set uploads directory ownership!"
    print_error "Please run manually: sudo chown -R 1001:1001 uploads && sudo chmod -R 755 uploads"
    exit 1
fi

# ============================================================================
# Step 7: Build Docker images (build-first; containers stop only after success)
# ============================================================================
# If build fails, existing container keeps running (no downtime)
print_info "Building Docker images (--no-cache)..."
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

print_info "   Existing containers left running until build succeeds."
print_info "   ========================================="

BUILD_START=$(date +%s)
if $DOCKER_COMPOSE_CMD --progress=plain build --no-cache; then
    BUILD_EXIT=0
else
    BUILD_EXIT=$?
fi
BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))
print_info "   ========================================="

if [ $BUILD_EXIT -ne 0 ]; then
    print_error "❌ Docker build failed! Existing container was not stopped and is still running."
    print_error "   Exit code: $BUILD_EXIT (${BUILD_DURATION}s)"
    print_error "   Fix the build and run ./deploy.sh again."
    exit 1
fi
print_info "✅ Build completed successfully (took ${BUILD_DURATION}s)"

# ============================================================================
# Step 8: Stop existing containers
# ============================================================================
print_info "Stopping existing containers..."
CONTAINER_NAME=$(grep container_name docker-compose.yml 2>/dev/null | cut -d: -f2 | tr -d ' \"' || echo "")
if [ -n "$CONTAINER_NAME" ]; then
    RUNNING_CONTAINERS=$(docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" 2>/dev/null || echo "")
else
    PROJECT_NAME=$(basename "$APP_DIR" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]')
    RUNNING_CONTAINERS=$(docker ps --filter "label=com.docker.compose.project=$PROJECT_NAME" --format "{{.Names}}" 2>/dev/null || echo "")
    [ -z "$RUNNING_CONTAINERS" ] && RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -E "(tabadl|alkon|crm)" || echo "")
fi
if [ -n "$RUNNING_CONTAINERS" ]; then
    $DOCKER_COMPOSE_CMD down --remove-orphans 2>&1 || true
    docker stop $RUNNING_CONTAINERS 2>/dev/null || true
    docker rm $RUNNING_CONTAINERS 2>/dev/null || true
    print_info "   ✅ Containers stopped"
else
    print_info "   No running containers found"
fi

# ============================================================================
# Step 9: Start containers
# ============================================================================
print_info "Starting containers with --force-recreate..."
# Use --force-recreate to ensure containers are recreated even if images exist
# Use --build to ensure we use the freshly built images
START_OUTPUT=$($DOCKER_COMPOSE_CMD up -d --force-recreate --build 2>&1)
START_EXIT=$?

if [ $START_EXIT -ne 0 ]; then
    print_error "❌ Failed to start containers!"
    print_error "   Exit code: $START_EXIT"
    print_error "   Output: $START_OUTPUT"
    print_error ""
    print_error "Checking container status..."
    $DOCKER_COMPOSE_CMD ps 2>&1 | while read line; do
        print_error "   $line"
    done
    print_error ""
    print_error "Container logs:"
    $DOCKER_COMPOSE_CMD logs --tail=50 2>&1 | while read line; do
        print_error "   $line"
    done
    exit 1
fi

# Show container status
print_info "Container status:"
$DOCKER_COMPOSE_CMD ps 2>&1 | while read line; do
    print_info "   $line"
done

# ============================================================================
# Step 10: Wait for health check
# ============================================================================
print_info "Waiting for application to start..."
sleep 10

HEALTHY=false

# Check container status
print_info "Waiting for containers to be healthy..."
HEALTH_CHECK_COUNT=0
for i in {1..10}; do
    sleep 2
    HEALTH_CHECK_COUNT=$((HEALTH_CHECK_COUNT + 1))
    CONTAINER_STATUS=$($DOCKER_COMPOSE_CMD ps 2>&1 | grep -E "(Up|healthy|unhealthy)" || echo "")
    if echo "$CONTAINER_STATUS" | grep -q "Up.*healthy"; then
        HEALTHY=true
        print_info "   ✅ Container is healthy (after ${HEALTH_CHECK_COUNT} checks)"
        break
    elif echo "$CONTAINER_STATUS" | grep -q "Up"; then
        print_info "   ⏳ Container is up but not healthy yet (check $i/10)..."
    else
        print_warn "   ⚠️  Container status: $CONTAINER_STATUS"
    fi
done

# Check health endpoint
if [ "$HEALTHY" = "false" ]; then
    print_info "Checking health endpoint: ${APP_URL}/api/health"
    for i in {1..25}; do
        [ "$i" -eq 1 ] && sleep 3 || sleep 2
        HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${APP_URL}/api/health" 2>&1 || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            HEALTHY=true
            print_info "   ✅ Health endpoint responded (HTTP $HTTP_CODE) after $((i * 2 + 3))s"
            break
        elif [ "$HTTP_CODE" != "000" ]; then
            print_info "   ⏳ Health endpoint returned HTTP $HTTP_CODE (check $i/25)..."
        else
            print_info "   ⏳ Health endpoint not responding yet (check $i/25)..."
        fi
    done
fi

if [ "$HEALTHY" = "true" ]; then
    print_info "✅ Application is running successfully!"
    print_info "Application URL: $APP_URL"
    print_info ""
    print_info "Useful commands (run from app directory $APP_DIR):"
    print_info "  View logs:    cd $APP_DIR && $DOCKER_COMPOSE_CMD logs -f"
    print_info "  Stop:         cd $APP_DIR && $DOCKER_COMPOSE_CMD down"
    print_info "  Restart:      cd $APP_DIR && $DOCKER_COMPOSE_CMD restart"
    print_info "  Status:       cd $APP_DIR && $DOCKER_COMPOSE_CMD ps"
else
    print_error "❌ Health check failed after all attempts"
    print_error "Application URL: $APP_URL"
    print_error ""
    print_error "Container status:"
    $DOCKER_COMPOSE_CMD ps 2>&1 | while read line; do
        print_error "   $line"
    done
    print_error ""
    print_error "Recent container logs (last 30 lines):"
    $DOCKER_COMPOSE_CMD logs --tail=30 2>&1 | while read line; do
        print_error "   $line"
    done
    print_error ""
    print_error "Troubleshooting steps:"
    print_error "  1. Check logs: cd $APP_DIR && $DOCKER_COMPOSE_CMD logs -f"
    print_error "  2. Check container: cd $APP_DIR && $DOCKER_COMPOSE_CMD ps"
    print_error "  3. Verify .env file has correct values"
    print_error "  4. Check database connection (if applicable)"
    print_error "  5. Verify port 3000 is not in use: netstat -tuln | grep 3000"
fi

print_info "Deployment complete!"
