#!/bin/bash
# Script to initialize upload directories on host with correct ownership
# Run this BEFORE starting Docker containers: chmod +x init-uploads.sh && ./init-uploads.sh
# Or with sudo if needed: sudo ./init-uploads.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPLOADS_DIR="$SCRIPT_DIR/uploads"

echo "📁 Creating upload directories with correct ownership..."

# Create base uploads directory (requires sudo if parent doesn't exist)
if [ ! -d "$UPLOADS_DIR" ]; then
    sudo mkdir -p "$UPLOADS_DIR" 2>/dev/null || mkdir -p "$UPLOADS_DIR"
fi

# Create subdirectories
sudo mkdir -p "$UPLOADS_DIR/applications" 2>/dev/null || mkdir -p "$UPLOADS_DIR/applications"
sudo mkdir -p "$UPLOADS_DIR/leads" 2>/dev/null || mkdir -p "$UPLOADS_DIR/leads"

# Set ownership to container user (uid 1001, gid 1001)
# Container runs as nextjs (uid 1001), nodejs (gid 1001)
if sudo chown -R 1001:1001 "$UPLOADS_DIR" 2>/dev/null; then
    echo "✅ Set ownership to uid 1001:gid 1001 (container user)"
    sudo chmod -R 755 "$UPLOADS_DIR"
    echo "✅ Set permissions to 755"
else
    # Try without sudo first (if already owned by user)
    if chown -R 1001:1001 "$UPLOADS_DIR" 2>/dev/null; then
        echo "✅ Set ownership to uid 1001:gid 1001 (container user)"
        chmod -R 755 "$UPLOADS_DIR"
        echo "✅ Set permissions to 755"
    else
        echo "⚠️  Could not set ownership to 1001:1001"
        echo "   Attempting alternative fix..."
        
        # Get current user's group
        CURRENT_USER=$(id -u)
        CURRENT_GROUP=$(id -g)
        
        # Try to use current user's group
        if sudo chown -R "$CURRENT_USER:$CURRENT_GROUP" "$UPLOADS_DIR" 2>/dev/null; then
            sudo chmod -R 775 "$UPLOADS_DIR"
            echo "✅ Set ownership to $CURRENT_USER:$CURRENT_GROUP with 775 permissions"
        else
            # Last resort: use more permissive permissions
            sudo chmod -R 777 "$UPLOADS_DIR" 2>/dev/null || chmod -R 777 "$UPLOADS_DIR"
            echo "⚠️  Using 777 permissions (less secure)"
            echo "   Run manually: sudo chown -R 1001:1001 uploads && sudo chmod -R 755 uploads"
        fi
    fi
fi

# Verify ownership
CURRENT_OWNER=$(stat -c "%U:%G (%u:%g)" "$UPLOADS_DIR" 2>/dev/null || stat -f "%Su:%Sg" "$UPLOADS_DIR" 2>/dev/null || echo "unknown")
echo ""
echo "✅ Upload directories created:"
echo "   - $UPLOADS_DIR/applications"
echo "   - $UPLOADS_DIR/leads"
echo "   - Current owner: $CURRENT_OWNER"
echo ""
echo "Next steps:"
echo "  1. Restart container: docker-compose restart"
echo "  2. Verify: docker exec tabadl-alkon-crm test -w /app/uploads && echo 'Writable' || echo 'NOT writable'"

