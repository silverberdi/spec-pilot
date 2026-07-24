# Technology Decisions

- **Monorepo:** Nx, because Angular/NestJS applications and shared TypeScript libraries benefit from dependency boundaries and affected commands.
- **Frontend:** Angular 22 standalone APIs, signals where appropriate, strict TypeScript, PrimeNG and PrimeIcons.
- **Backend:** NestJS with Fastify.
- **Database:** PostgreSQL with Prisma ORM and migrations.
- **Jobs:** PostgreSQL-backed durable job records initially; avoid adding Redis before demonstrated need.
- **Streaming:** Server-Sent Events for progress; no bidirectional WebSocket requirement in initial release.
- **Validation:** Zod or equivalent runtime schemas at boundaries; OpenAPI generated from the API.
- **Testing:** Vitest/Jest as Nx-supported unit runner, API integration tests with Testcontainers PostgreSQL, Playwright for essential web flows.
- **Deployment:** local Docker Compose for API, web, worker, and PostgreSQL; native macOS development remains supported.
