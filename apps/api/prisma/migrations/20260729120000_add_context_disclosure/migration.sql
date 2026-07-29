-- CreateTable
CREATE TABLE "context_disclosure_preview_sessions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "context_bundle_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "configuration_version_id" TEXT NOT NULL,
    "source_hash" TEXT NOT NULL,
    "manifest_schema_version" INTEGER NOT NULL,
    "selection_policy_id" TEXT NOT NULL,
    "token_estimator_id" TEXT NOT NULL,
    "manifest_hash" TEXT NOT NULL,
    "preview_policy_id" TEXT NOT NULL,
    "preview_integrity_hash" TEXT NOT NULL,
    "item_count" INTEGER NOT NULL,
    "previewed_code_point_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_disclosure_preview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_disclosure_approvals" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "context_bundle_id" TEXT NOT NULL,
    "preview_session_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "configuration_version_id" TEXT NOT NULL,
    "source_hash" TEXT NOT NULL,
    "manifest_schema_version" INTEGER NOT NULL,
    "selection_policy_id" TEXT NOT NULL,
    "token_estimator_id" TEXT NOT NULL,
    "manifest_hash" TEXT NOT NULL,
    "preview_policy_id" TEXT NOT NULL,
    "approval_policy_id" TEXT NOT NULL,
    "preview_integrity_hash" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "content_transmitted" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_disclosure_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "context_disclosure_preview_sessions_project_id_context_bund_idx" ON "context_disclosure_preview_sessions"("project_id", "context_bundle_id", "created_at");

-- CreateIndex
CREATE INDEX "context_disclosure_approvals_project_id_stage_created_at_idx" ON "context_disclosure_approvals"("project_id", "stage", "created_at");

-- CreateIndex
CREATE INDEX "context_disclosure_approvals_context_bundle_id_idx" ON "context_disclosure_approvals"("context_bundle_id");

-- CreateIndex
CREATE INDEX "context_disclosure_approvals_preview_session_id_idx" ON "context_disclosure_approvals"("preview_session_id");

-- AddForeignKey
ALTER TABLE "context_disclosure_preview_sessions" ADD CONSTRAINT "context_disclosure_preview_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_disclosure_preview_sessions" ADD CONSTRAINT "context_disclosure_preview_sessions_context_bundle_id_fkey" FOREIGN KEY ("context_bundle_id") REFERENCES "context_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_disclosure_approvals" ADD CONSTRAINT "context_disclosure_approvals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_disclosure_approvals" ADD CONSTRAINT "context_disclosure_approvals_context_bundle_id_fkey" FOREIGN KEY ("context_bundle_id") REFERENCES "context_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_disclosure_approvals" ADD CONSTRAINT "context_disclosure_approvals_preview_session_id_fkey" FOREIGN KEY ("preview_session_id") REFERENCES "context_disclosure_preview_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

