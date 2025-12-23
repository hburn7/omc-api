FROM oven/bun:1

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
EXPOSE 8080

ENV NODE_ENV=production

CMD ["bun", "index.ts"]