# Reproducible production image for QuranChain-OS
# Build dependencies and frontend assets inside the container build rather than
# copying host node_modules or prebuilt artifacts from an untrusted workspace.

FROM node:18-alpine AS backend-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:18-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:18-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
COPY --from=backend-deps /app/node_modules ./node_modules
COPY --chown=node:node src/ ./src/
COPY --from=frontend-build --chown=node:node /app/client/dist ./client/dist

RUN mkdir -p /app/logs && chown -R node:node /app/logs

USER node
EXPOSE 3000
CMD ["npm", "start"]
