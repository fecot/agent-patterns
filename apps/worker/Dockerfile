# 開発用 Dockerfile (build context = リポジトリルート)。
FROM node:22-bookworm-slim

WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install

CMD ["pnpm", "--filter", "@lab/worker", "dev"]
