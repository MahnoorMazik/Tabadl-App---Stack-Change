#!/bin/bash
# Creates deployment package for Tabadl Alkon CRM (new style)
# Output: tk-deployment.zip with top-level contents:
#   deploy.sh            <- run this on server
#   deployment/          <- app files (Dockerfile, src, prisma, etc.)
#
# On server (first time): unzip tk-deployment.zip && ./deploy.sh
# On server (update): unzip -o tk-deployment.zip && ./deploy.sh
# (main-project/.env, uploads, logs are preserved on update)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$SCRIPT_DIR}"
ZIP_PATH="${PROJECT_ROOT}/tk-deployment.zip"
TEMP_DIR="${TMPDIR:-/tmp}/ta-deployment-$$"
DEPLOY_ROOT="$TEMP_DIR"
DEPLOYMENT_FOLDER="$DEPLOY_ROOT/deployment"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_error() { echo -e "${RED}❌ $1${NC}" >&2; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
print_info "Creating Tabadl Alkon CRM deployment package (new style: deploy.sh + deployment/)..."
echo ""

rm -rf "$TEMP_DIR"
rm -f "$ZIP_PATH"
mkdir -p "$DEPLOYMENT_FOLDER"
cd "$PROJECT_ROOT"

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
print_info "Running pre-flight checks..."

REQUIRED_FILES=("Dockerfile" "docker-compose.yml" "docker-entrypoint.sh" "package.json" "deploy.sh")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$PROJECT_ROOT/$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done
print_success "All required files found"

if [ ! -f "prisma/schema.prisma" ]; then
    print_error "Prisma schema not found: prisma/schema.prisma"
    exit 1
fi
print_success "Prisma schema found"

# -----------------------------------------------------------------------------
# TypeScript type check (optional; set SKIP_TYPE_CHECK=1 to skip)
# -----------------------------------------------------------------------------
if [ "${SKIP_TYPE_CHECK:-0}" != "1" ]; then
    print_info "Running TypeScript type check..."
    if pnpm run type-check 2>&1; then
        print_success "Type check passed"
    else
        print_warning "Type check failed - fix before deployment or set SKIP_TYPE_CHECK=1 to skip"
        exit 1
    fi
else
    print_warning "Skipping type check (SKIP_TYPE_CHECK=1)"
fi

# -----------------------------------------------------------------------------
# Prisma schema validation
# -----------------------------------------------------------------------------
print_info "Validating Prisma schema..."
if ! pnpm exec prisma validate 2>&1; then
    print_error "Prisma schema invalid. Fix schema.prisma before creating deployment."
    exit 1
fi
print_success "Prisma schema valid"

# -----------------------------------------------------------------------------
# Production build verification (optional; set SKIP_BUILD=1 to skip)
# -----------------------------------------------------------------------------
if [ "${SKIP_BUILD:-0}" != "1" ]; then
    print_info "Running production build (verification only, not included in zip)..."
    if [ -d "$PROJECT_ROOT/.next" ]; then
        rm -rf "$PROJECT_ROOT/.next" 2>/dev/null || {
            print_warning "Could not remove .next (try: sudo rm -rf $PROJECT_ROOT/.next)"
            exit 1
        }
    fi
    if ! pnpm run build 2>&1; then
        print_error "Build failed. Fix errors before creating deployment or set SKIP_BUILD=1."
        exit 1
    fi
    print_success "Build passed"
else
    print_warning "Skipping build verification (SKIP_BUILD=1)"
fi

# -----------------------------------------------------------------------------
# Package layout: deploy.sh at root, app files inside deployment/
# -----------------------------------------------------------------------------
print_info "Creating package layout (deploy.sh + deployment/)..."

cp "$PROJECT_ROOT/deploy.sh" "$DEPLOY_ROOT/deploy.sh"
chmod +x "$DEPLOY_ROOT/deploy.sh"
print_success "Added: deploy.sh"

# Core files -> deployment/
CORE_FILES=(
    'Dockerfile'
    'docker-compose.yml'
    'docker-entrypoint.sh'
    '.dockerignore'
    'package.json'
    'pnpm-lock.yaml'
    'tsconfig.json'
    'next.config.ts'
    'tailwind.config.ts'
    'postcss.config.mjs'
    'eslint.config.mjs'
    'components.json'
    'server.ts'
    'middleware.ts'
    'env.production.example'
    '.env.example'
    'init-uploads.sh'
)
for file in "${CORE_FILES[@]}"; do
    if [ -e "$PROJECT_ROOT/$file" ]; then
        cp "$PROJECT_ROOT/$file" "$DEPLOYMENT_FOLDER/$file"
        print_success "Added: deployment/$file"
    fi
done

# Directories -> deployment/
DIRS_TO_INCLUDE=('prisma' 'src' 'public' 'scripts')
for dir in "${DIRS_TO_INCLUDE[@]}"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        mkdir -p "$DEPLOYMENT_FOLDER/$dir"
        if [ "$dir" = "prisma" ]; then
            rsync -a \
                --exclude='node_modules' --exclude='.next' --exclude='.git' \
                --exclude='*.db' --exclude='*.log' --exclude='__pycache__' --exclude='*.pyc' \
                --exclude='uploads' --exclude='*.sqlite' --exclude='db' \
                "$PROJECT_ROOT/$dir/" "$DEPLOYMENT_FOLDER/$dir/"
        else
            rsync -a \
                --exclude='node_modules' --exclude='.next' --exclude='.git' \
                --exclude='*.db' --exclude='*.log' --exclude='__pycache__' --exclude='*.pyc' \
                --exclude='uploads' --exclude='*.sqlite' \
                "$PROJECT_ROOT/$dir/" "$DEPLOYMENT_FOLDER/$dir/"
        fi
        print_success "Added directory: deployment/$dir"
    fi
done

chmod +x "$DEPLOYMENT_FOLDER/docker-entrypoint.sh" 2>/dev/null || true

# -----------------------------------------------------------------------------
# Create deployment zip (contents at top level: deploy.sh + deployment/)
# -----------------------------------------------------------------------------
print_info "Creating tk-deployment.zip..."
cd "$DEPLOY_ROOT"
zip -r -q "$ZIP_PATH" .
rm -rf "$TEMP_DIR"

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
print_success "Deployment package created successfully!"
echo ""

if [ -f "$ZIP_PATH" ]; then
    SIZE=$(du -h "$ZIP_PATH" | cut -f1)
    echo -e "${GREEN}File: $ZIP_PATH${NC}"
    echo -e "${GREEN}Size: $SIZE${NC}"
fi

echo "Package contents (unzip gives these at top level):"
echo "  deploy.sh            <- run this (copies deployment/ to main-project, then build & start)"
echo "  deployment/          <- app files (Dockerfile, docker-compose, src/, prisma/, etc.)"
echo ""
echo "On server (first time):"
echo "  1. mkdir -p deployment-files && cd deployment-files"
echo "  2. Upload tk-deployment.zip and run: unzip tk-deployment.zip"
echo "  3. ./deploy.sh"
echo ""
echo "On server (update):"
echo "  1. From the same folder (with deploy.sh and deployment/), upload new tk-deployment.zip"
echo "  2. unzip -o tk-deployment.zip"
echo "  3. ./deploy.sh"
echo "  (main-project/.env, uploads, logs are not in the zip and are preserved)"
echo ""
print_warning "Reminder: If you changed the schema, run 'pnpm exec prisma migrate dev' and commit migrations before creating deployment."
echo ""
