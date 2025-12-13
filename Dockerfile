# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* tsconfig.json ./
COPY server ./server
COPY public ./public
RUN npm ci
RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production \
    PORT=2091 \
    MCP_PATH=/mcp
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
EXPOSE 2091
CMD ["node", "dist/server/src/index.js"]
