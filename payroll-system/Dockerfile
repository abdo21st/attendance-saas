# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install ALL dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema + generated client for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/generated ./src/generated

# Copy seed script
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=builder /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
COPY --from=builder /app/node_modules/resolve-pkg-maps ./node_modules/resolve-pkg-maps

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations, seed, then start
CMD ["sh", "-c", "npx prisma migrate deploy && (npx tsx prisma/seed.ts 2>/dev/null || true) && node server.js"]
