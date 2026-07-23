#!/bin/bash
# Adds VAPID keys to .env for push notifications
# Usage: ./scripts/add-vapid-keys.sh

set -e
cd "$(dirname "$0")/.."

if [ ! -f ".env" ]; then
  echo "No .env file found. Run ./setup-local.sh first."
  exit 1
fi

echo "Generating VAPID keys..."
VAPID_OUTPUT=$(node -e "
  const wp = require('web-push');
  const k = wp.generateVAPIDKeys();
  console.log(k.publicKey);
  console.log(k.privateKey);
")

VAPID_PUBLIC=$(echo "$VAPID_OUTPUT" | head -1)
VAPID_PRIVATE=$(echo "$VAPID_OUTPUT" | tail -1)

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*|NEXT_PUBLIC_VAPID_PUBLIC_KEY=$VAPID_PUBLIC|" .env
  sed -i '' "s|VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$VAPID_PRIVATE|" .env
else
  sed -i "s|NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*|NEXT_PUBLIC_VAPID_PUBLIC_KEY=$VAPID_PUBLIC|" .env
  sed -i "s|VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$VAPID_PRIVATE|" .env
fi

echo "✅ VAPID keys added to .env. Restart your dev server."
echo ""
echo "Public key:  ${VAPID_PUBLIC:0:40}..."
echo "Private key: ${VAPID_PRIVATE:0:20}..."
