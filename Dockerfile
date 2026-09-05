FROM node:20-alpine AS base

# --- deps ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci --ignore-scripts
RUN npx prisma generate

# --- build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

# --- production deps ---
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# --- production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/src/generated ./src/generated
COPY --from=deps /app/prisma ./prisma
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/storage/uploads
RUN chown -R nextjs:nodejs /app/storage /app/node_modules

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/bin/sh", "./docker-entrypoint.sh"]
