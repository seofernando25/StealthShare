FROM oven/bun:alpine AS builder

WORKDIR /app

COPY bun.lockb package.json ./

RUN bun install --frozen-lockfile

COPY . .

ENV CI=true

RUN bun run build

FROM oven/bun:alpine AS runner

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.ts ./

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["bun", "run", "server.ts"]

