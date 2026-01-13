FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run cf-typegen
RUN npm run build 2>/dev/null || echo "Build step not configured"

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/public ./public
COPY --from=builder /app/wrangler.jsonc ./
COPY --from=builder /app/tsconfig.json ./

ENV NODE_ENV=production

EXPOSE 8787

CMD ["npx", "wrangler", "dev", "--port", "8787", "--ip", "0.0.0.0"]
