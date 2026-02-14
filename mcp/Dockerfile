# Use Node.js 18 Alpine for smaller image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S quranchain -u 1001

# Change ownership
RUN chown -R quranchain:nodejs /app
USER quranchain

# Expose port (though MCP uses stdio, not HTTP)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('MCP server health check')"

# Start the MCP server
CMD ["node", "dist/index.js"]