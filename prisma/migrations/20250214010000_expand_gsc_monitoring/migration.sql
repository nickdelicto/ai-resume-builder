-- AlterTable: Add device breakdown to GscSiteSummary
ALTER TABLE "GscSiteSummary" ADD COLUMN "mobileClicks" INTEGER;
ALTER TABLE "GscSiteSummary" ADD COLUMN "mobileImpressions" INTEGER;
ALTER TABLE "GscSiteSummary" ADD COLUMN "desktopClicks" INTEGER;
ALTER TABLE "GscSiteSummary" ADD COLUMN "desktopImpressions" INTEGER;

-- CreateTable
CREATE TABLE "GscUrlInspection" (
    "id" SERIAL NOT NULL,
    "page" TEXT NOT NULL,
    "inspectedAt" DATE NOT NULL,
    "verdict" TEXT NOT NULL,
    "coverageState" TEXT,
    "indexingState" TEXT,
    "crawledAs" TEXT,
    "lastCrawlTime" TIMESTAMP(3),
    "pageFetchState" TEXT,
    "robotsTxtState" TEXT,
    "userCanonical" TEXT,
    "googleCanonical" TEXT,
    "referringUrls" TEXT[],
    "sitemap" TEXT,
    "richResultsVerdict" TEXT,
    "richResultsTypes" TEXT[],
    "richResultsIssues" JSONB,
    "mobileUsabilityVerdict" TEXT,
    "mobileUsabilityIssues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscUrlInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscSitemapStatus" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "lastDownloaded" TIMESTAMP(3),
    "lastSubmitted" TIMESTAMP(3),
    "isPending" BOOLEAN NOT NULL DEFAULT false,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "warnings" INTEGER NOT NULL DEFAULT 0,
    "contents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscSitemapStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscDeviceMetric" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "device" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscDeviceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscPageQueryMetric" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "page" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscPageQueryMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GscUrlInspection_page_inspectedAt_key" ON "GscUrlInspection"("page", "inspectedAt");
CREATE INDEX "GscUrlInspection_inspectedAt_idx" ON "GscUrlInspection"("inspectedAt");
CREATE INDEX "GscUrlInspection_page_idx" ON "GscUrlInspection"("page");
CREATE INDEX "GscUrlInspection_verdict_idx" ON "GscUrlInspection"("verdict");

-- CreateIndex
CREATE UNIQUE INDEX "GscSitemapStatus_date_path_key" ON "GscSitemapStatus"("date", "path");
CREATE INDEX "GscSitemapStatus_date_idx" ON "GscSitemapStatus"("date");

-- CreateIndex
CREATE UNIQUE INDEX "GscDeviceMetric_date_device_key" ON "GscDeviceMetric"("date", "device");
CREATE INDEX "GscDeviceMetric_date_idx" ON "GscDeviceMetric"("date");

-- CreateIndex
CREATE UNIQUE INDEX "GscPageQueryMetric_date_page_query_key" ON "GscPageQueryMetric"("date", "page", "query");
CREATE INDEX "GscPageQueryMetric_date_idx" ON "GscPageQueryMetric"("date");
CREATE INDEX "GscPageQueryMetric_page_idx" ON "GscPageQueryMetric"("page");
CREATE INDEX "GscPageQueryMetric_query_idx" ON "GscPageQueryMetric"("query");
