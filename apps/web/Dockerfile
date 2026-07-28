# SpecPilot web — Angular production build served by nginx
FROM node:24.18.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json nx.json tsconfig.base.json tsconfig.json ./
COPY apps/web apps/web
COPY packages/shared-contracts packages/shared-contracts
COPY jest.preset.js jest.config.ts ./

# Compose injects the Community key via build-arg from the gitignored repo-root `.env`.
# Keep apps/web/src/environments/environment.local.ts out of the Docker context
# (.dockerignore) so the key is never copied as a build-context file by accident.
ARG PRIMEUI_LICENSE=
ARG API_BASE_URL=http://localhost:3000
RUN npm ci \
  && node -e "const fs=require('fs'); const license=process.env.PRIMEUI_LICENSE||''; const apiBaseUrl=process.env.API_BASE_URL||'http://localhost:3000'; if(!license.trim()){ console.error('PRIMEUI_LICENSE build-arg is required for Compose/Docker web builds. Set PRIMEUI_LICENSE in the gitignored repo-root .env (same Community key as apps/web/src/environments/environment.local.ts), then rebuild: docker compose build --no-cache web && docker compose up -d web'); process.exit(1);} fs.writeFileSync('apps/web/src/environments/environment.local.ts', '/**\\n * Generated at Docker build time from PRIMEUI_LICENSE / API_BASE_URL build-args.\\n * Not committed; Compose source of truth is the gitignored repo-root .env.\\n */\\nexport const environment = {\\n  primeUiLicense: ' + JSON.stringify(license) + ',\\n  apiBaseUrl: ' + JSON.stringify(apiBaseUrl) + ',\\n};\\n');" \
  && npx nx build web --configuration=production

FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/web/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
