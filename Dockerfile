# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_BACKEND_BASE_URL
ENV NEXT_PUBLIC_BACKEND_BASE_URL=${NEXT_PUBLIC_BACKEND_BASE_URL}
ARG NEXT_PUBLIC_ADMIN_GRANT_CREDITS=false
ENV NEXT_PUBLIC_ADMIN_GRANT_CREDITS=${NEXT_PUBLIC_ADMIN_GRANT_CREDITS}
ARG NEXT_PUBLIC_ADMIN_BUSINESS_SMS=false
ENV NEXT_PUBLIC_ADMIN_BUSINESS_SMS=${NEXT_PUBLIC_ADMIN_BUSINESS_SMS}
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
	&& adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
