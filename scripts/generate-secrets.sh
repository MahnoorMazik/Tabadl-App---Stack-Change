#!/bin/bash
# Bash script to generate secrets for production
# Usage: ./scripts/generate-secrets.sh

echo "======================================="
echo "Generating Production Secrets"
echo "======================================="
echo ""

# Generate NEXTAUTH_SECRET (32+ characters)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "NEXTAUTH_SECRET:"
echo "$NEXTAUTH_SECRET"
echo ""

# Generate JWT_SECRET (40+ characters)
JWT_SECRET=$(openssl rand -base64 48)
echo "JWT_SECRET:"
echo "$JWT_SECRET"
echo ""

# Generate VAPID keys
echo "Generating VAPID keys..."
pnpm exec web-push generate-vapid-keys
echo ""

echo "======================================="
echo "Copy these values to your .env file"
echo "======================================="
