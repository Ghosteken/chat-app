FROM node:18-alpine
WORKDIR /app


COPY package.json package-lock.json* ./
RUN npm install


COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY public ./public
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]

