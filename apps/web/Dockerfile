# 開発用 Dockerfile (build context = リポジトリルート)。
# Vite dev server を 0.0.0.0:3000 で起動し、/api は API サーバへプロキシする。
FROM node:22-bookworm-slim

WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install

EXPOSE 3000
CMD ["pnpm", "--filter", "@lab/web", "dev"]
