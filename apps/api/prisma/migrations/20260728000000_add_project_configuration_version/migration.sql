-- AlterTable
ALTER TABLE "projects" ADD COLUMN "configuration_version_id" TEXT;

-- CreateTable
CREATE TABLE "project_configuration_versions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "source_hash" TEXT NOT NULL,
    "normalized_config" JSONB NOT NULL,
    "validated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_configuration_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_configuration_versions_project_id_source_hash_key" ON "project_configuration_versions"("project_id", "source_hash");

-- AddForeignKey
ALTER TABLE "project_configuration_versions" ADD CONSTRAINT "project_configuration_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_configuration_version_id_fkey" FOREIGN KEY ("configuration_version_id") REFERENCES "project_configuration_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
