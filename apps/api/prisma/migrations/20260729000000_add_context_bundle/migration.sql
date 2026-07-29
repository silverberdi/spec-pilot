-- CreateTable
CREATE TABLE "context_bundles" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "configuration_version_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "source_hash" TEXT NOT NULL,
    "manifest_schema_version" INTEGER NOT NULL,
    "selection_policy_id" TEXT NOT NULL,
    "token_estimator_id" TEXT NOT NULL,
    "manifest_hash" TEXT NOT NULL,
    "entry_count" INTEGER NOT NULL,
    "total_token_estimate" INTEGER NOT NULL,
    "candidate_path_count" INTEGER NOT NULL,
    "eligible_path_count" INTEGER NOT NULL,
    "excluded_path_count" INTEGER NOT NULL,
    "finding_count" INTEGER NOT NULL,
    "unscannable_count" INTEGER NOT NULL,
    "entries" JSONB NOT NULL,
    "exclusions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "context_bundles_project_id_stage_created_at_idx" ON "context_bundles"("project_id", "stage", "created_at");

-- AddForeignKey
ALTER TABLE "context_bundles" ADD CONSTRAINT "context_bundles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
