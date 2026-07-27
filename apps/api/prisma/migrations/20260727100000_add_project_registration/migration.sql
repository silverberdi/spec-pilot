-- AlterTable / CreateTable: bounded Project registration (w01-s01)
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "repository_path" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_inspected_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");
CREATE UNIQUE INDEX "projects_repository_path_key" ON "projects"("repository_path");
