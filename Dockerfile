FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate

EXPOSE 3001

CMD ["npx", "tsx", "server/socket.ts"]
