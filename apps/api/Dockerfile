# 開発用 Dockerfile (build context = リポジトリルート)。
# 学習リポジトリなので本番最適化より「読めば分かる」ことを優先している。
FROM node:22-bookworm-slim

WORKDIR /app
RUN corepack enable

# workspace 全体を入れて pnpm install する。
# 実行時は compose 側で src ディレクトリだけを bind mount し、hot reload させる。
COPY . .
RUN pnpm install

EXPOSE 8080
CMD ["pnpm", "--filter", "@lab/api", "dev"]
