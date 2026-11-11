-- Slice 1.4: contacts become Odoo-like partners (companies and people in one table).
-- Generated with `prisma migrate diff`, then edited by hand to keep the contacts of slice 1.3:
-- each becomes a person without a company, named "first last", its owner as salesperson.

-- DropIndex
DROP INDEX "contacts"."contacts_team_id_email_key";

-- DropIndex
DROP INDEX "contacts"."contacts_team_id_updated_at_idx";

-- AlterTable: add the new columns, nullable first so existing rows can be filled.
ALTER TABLE "contacts"."contacts"
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country_code" CHAR(2),
ADD COLUMN     "industry_id" UUID,
ADD COLUMN     "is_company" BOOLEAN,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "parent_id" UUID,
ADD COLUMN     "salesperson_id" UUID,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "tax_id" TEXT,
ADD COLUMN     "website" TEXT;

UPDATE "contacts"."contacts"
SET "is_company" = false,
    "name" = trim(concat_ws(' ', "first_name", "last_name")),
    "salesperson_id" = "owner_id";

ALTER TABLE "contacts"."contacts"
ALTER COLUMN "is_company" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "contacts"."contacts" DROP COLUMN "first_name",
DROP COLUMN "last_name",
DROP COLUMN "owner_id",
DROP COLUMN "stage",
DROP COLUMN "team_id";

-- DropEnum
DROP TYPE "contacts"."contact_stage";

-- CreateTable
CREATE TABLE "contacts"."industries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "archived_at" TIMESTAMPTZ,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts"."tags" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts"."contact_tags" (
    "contact_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("contact_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "industries_name_key" ON "contacts"."industries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key_key" ON "contacts"."tags"("name_key");

-- CreateIndex
CREATE INDEX "contact_tags_tag_id_idx" ON "contacts"."contact_tags"("tag_id");

-- CreateIndex
CREATE INDEX "contacts_parent_id_idx" ON "contacts"."contacts"("parent_id");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"."contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_salesperson_id_idx" ON "contacts"."contacts"("salesperson_id");

-- CreateIndex
CREATE INDEX "contacts_updated_at_idx" ON "contacts"."contacts"("updated_at");

-- AddForeignKey
ALTER TABLE "contacts"."contacts" ADD CONSTRAINT "contacts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "contacts"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts"."contacts" ADD CONSTRAINT "contacts_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "contacts"."industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts"."contact_tags" ADD CONSTRAINT "contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts"."contact_tags" ADD CONSTRAINT "contact_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "contacts"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
