# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Create data directory for file persistence
RUN mkdir -p data

# Build the Next.js app
# Set a dummy GEMINI_API_KEY for build time (it's only needed at runtime)
ENV GEMINI_API_KEY=dummy_key_for_build
RUN pnpm build

# Expose port 3000
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["pnpm", "start"]