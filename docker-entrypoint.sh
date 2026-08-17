#!/bin/sh
set -e

echo "Running prisma db push..."
npx prisma db push --schema prisma/schema.prisma --accept-data-loss --skip-generate

echo "Starting application..."
exec node server.js
