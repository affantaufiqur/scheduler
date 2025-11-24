# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Copy built output from builder stage
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

# Expose port
EXPOSE 3000

# Command to run the server
CMD ["node", ".output/server/index.mjs"]
