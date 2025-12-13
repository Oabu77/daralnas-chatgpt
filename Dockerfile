# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build:mcp

FROM node:20-alpine
ENV NODE_ENV=production PORT=2091 MCP_PATH=/mcp
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/public ./public
COPY package.json ./
RUN npm pkg delete devDependencies scripts.dev
EXPOSE 2091
CMD ["node", "dist/server/src/index.js"]
