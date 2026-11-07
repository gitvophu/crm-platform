-- CreateEnum
CREATE TYPE "contacts"."contact_stage" AS ENUM ('lead', 'prospect', 'customer', 'churned');

-- CreateTable
CREATE TABLE "contacts"."contacts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "team_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "job_title" TEXT,
    "stage" "contacts"."contact_stage" NOT NULL DEFAULT 'lead',
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_team_id_updated_at_idx" ON "contacts"."contacts"("team_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_team_id_email_key" ON "contacts"."contacts"("team_id", "email") WHERE (archived_at IS NULL AND email IS NOT NULL);
