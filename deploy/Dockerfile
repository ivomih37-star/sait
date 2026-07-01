# ===========================================================================
#  Multi-stage Dockerfile — РакияКлуб (Next.js standalone + Prisma)
#  Один образ обслуживает и веб-сервер, и процесс бота (разные команды).
# ===========================================================================
FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# --- deps ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- build ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- runtime ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Next standalone-вывод
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Prisma + бот/воркер + сгенерированный клиент
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/lib ./lib
COPY --from=build /app/bot ./bot
COPY --from=build /app/worker ./worker
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
# Веб по умолчанию; бот переопределяет command в compose
CMD ["node", "server.js"]
