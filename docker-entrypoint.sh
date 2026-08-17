#!/bin/sh
set -e

echo "Running prisma db push..."
node node_modules/prisma/build/index.js db push --schema prisma/schema.prisma --accept-data-loss --skip-generate

echo "Starting application..."
exec node server.js
