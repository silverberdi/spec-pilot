# SpecPilot web — Angular production build served by nginx
FROM node:24.18.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json nx.json tsconfig.base.json tsconfig.json ./
COPY apps/web apps/web
COPY packages/shared-contracts packages/shared-contracts
COPY jest.preset.js jest.config.ts ./
RUN npm ci \
  && if [ ! -f apps/web/src/environments/environment.local.ts ]; then \
       cp apps/web/src/environments/environment.local.example.ts apps/web/src/environments/environment.local.ts; \
     fi \
  && npx nx build web --configuration=production

FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/web/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
