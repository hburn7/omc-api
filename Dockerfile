FROM oven/bun:latest

WORKDIR /app
COPY . .
EXPOSE 8080

ENV NODE_ENV=production

CMD ["bun", "index.ts"]