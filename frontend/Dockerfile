FROM node:24.14.0-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

EXPOSE 5175

CMD ["pnpm", "dev", "--host"]
