# ─────────────────────────────────────────────────────────────
# NoteVault — Dockerfile
# Base: node:20-alpine (smallest stable Node LTS image)
# ─────────────────────────────────────────────────────────────

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/

# Expose the port the app listens on
EXPOSE 3000

# Run as non-root user for security
USER node

# Start the server
CMD ["node", "src/app.js"]
