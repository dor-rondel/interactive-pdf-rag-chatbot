# pnpm 11 requires Node.js 22+
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@11.9.0

# Copy package files (pnpm-workspace.yaml carries allowBuilds for native deps)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

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