-- CreateTable
CREATE TABLE "review_runs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "configuration_version_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "change_id" TEXT,
    "state" TEXT NOT NULL,
    "context_bundle_id" TEXT,
    "manifest_hash" TEXT,
    "disclosure_approval_id" TEXT,
    "preview_session_id" TEXT,
    "preview_integrity_hash" TEXT,
    "preview_policy_id" TEXT,
    "approval_policy_id" TEXT,
    "budget_check_status" TEXT,
    "prompt_template_id" TEXT,
    "model_alias" TEXT,
    "resolved_model_id" TEXT,
    "schema_id" TEXT,
    "verdict" TEXT,
    "rationale" TEXT,
    "attempt_count" INTEGER,
    "latency_ms" INTEGER,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "blocked_code" TEXT,
    "failed_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "blocked_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),

    CONSTRAINT "review_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_run_transitions" (
    "id" TEXT NOT NULL,
    "review_run_id" TEXT NOT NULL,
    "from_state" TEXT,
    "to_state" TEXT NOT NULL,
    "code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_run_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_disclosure_transmissions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "review_run_id" TEXT NOT NULL,
    "context_bundle_id" TEXT NOT NULL,
    "disclosure_approval_id" TEXT NOT NULL,
    "preview_session_id" TEXT NOT NULL,
    "manifest_hash" TEXT NOT NULL,
    "preview_integrity_hash" TEXT NOT NULL,
    "preview_policy_id" TEXT NOT NULL,
    "approval_policy_id" TEXT NOT NULL,
    "prompt_template_id" TEXT NOT NULL,
    "schema_id" TEXT NOT NULL,
    "requested_model_alias" TEXT NOT NULL,
    "resolved_model_id" TEXT,
    "outcome" TEXT NOT NULL,
    "attempt_count" INTEGER,
    "latency_ms" INTEGER,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "provider_request_id" TEXT,
    "terminal_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_disclosure_transmissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_runs_project_id_created_at_idx" ON "review_runs"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "review_runs_project_id_stage_created_at_idx" ON "review_runs"("project_id", "stage", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "review_runs_one_inflight_per_project" ON "review_runs" ("project_id") WHERE state IN ('requested', 'preparing_context', 'budget_check', 'running', 'validating_response');

-- CreateIndex
CREATE INDEX "review_run_transitions_review_run_id_created_at_idx" ON "review_run_transitions"("review_run_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "context_disclosure_transmissions_review_run_id_key" ON "context_disclosure_transmissions"("review_run_id");

-- CreateIndex
CREATE INDEX "context_disclosure_transmissions_project_id_created_at_idx" ON "context_disclosure_transmissions"("project_id", "created_at");

-- AddForeignKey
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_context_bundle_id_fkey" FOREIGN KEY ("context_bundle_id") REFERENCES "context_bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_disclosure_approval_id_fkey" FOREIGN KEY ("disclosure_approval_id") REFERENCES "context_disclosure_approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_run_transitions" ADD CONSTRAINT "review_run_transitions_review_run_id_fkey" FOREIGN KEY ("review_run_id") REFERENCES "review_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_disclosure_transmissions" ADD CONSTRAINT "context_disclosure_transmissions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_disclosure_transmissions" ADD CONSTRAINT "context_disclosure_transmissions_review_run_id_fkey" FOREIGN KEY ("review_run_id") REFERENCES "review_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_disclosure_transmissions" ADD CONSTRAINT "context_disclosure_transmissions_context_bundle_id_fkey" FOREIGN KEY ("context_bundle_id") REFERENCES "context_bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_disclosure_transmissions" ADD CONSTRAINT "context_disclosure_transmissions_disclosure_approval_id_fkey" FOREIGN KEY ("disclosure_approval_id") REFERENCES "context_disclosure_approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_disclosure_transmissions" ADD CONSTRAINT "context_disclosure_transmissions_preview_session_id_fkey" FOREIGN KEY ("preview_session_id") REFERENCES "context_disclosure_preview_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
