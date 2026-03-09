FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install all dependencies (including dev for build)
RUN npm install

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:80').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run
CMD ["npm", "start"]
