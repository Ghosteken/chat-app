# Simple production Dockerfile for the chat backend
FROM node:18-alpine
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY public ./public
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
# Run migrations on startup, then start server
CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]

