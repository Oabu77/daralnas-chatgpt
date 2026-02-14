# Simple Dockerfile for QuranChain-OS
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy node_modules from host
COPY node_modules ./node_modules

# Copy source code
COPY src/ ./src/

# Copy built frontend
COPY client/dist ./client/dist

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]