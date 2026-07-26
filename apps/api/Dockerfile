# SpecPilot API — Node 24, Prisma migrate deploy, then NestJS
FROM node:24.18.0-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json nx.json tsconfig.base.json tsconfig.json ./
COPY apps/api apps/api
COPY packages/shared-contracts packages/shared-contracts
COPY jest.preset.js jest.config.ts ./
RUN npm ci \
  && DATABASE_URL='postgresql://specpilot:specpilot@localhost:5441/specpilot?schema=public' \
       npx prisma generate --schema=apps/api/prisma/schema.prisma --config=apps/api/prisma.config.ts \
  && npx nx build shared-contracts \
  && npx nx build api

FROM node:24.18.0-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node ../../dist/apps/api/main.js"]
