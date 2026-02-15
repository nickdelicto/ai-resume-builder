-- CreateTable
CREATE TABLE "BingPageMetric" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingPageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingQueryMetric" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "query" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingQueryMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingAlert" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" TEXT,
    "entityType" TEXT,
    "entity" TEXT,
    "currentValue" DOUBLE PRECISION,
    "previousValue" DOUBLE PRECISION,
    "changePercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingSiteSummary" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "avgCtr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "totalQueries" INTEGER NOT NULL DEFAULT 0,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingSiteSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BingPageMetric_date_page_key" ON "BingPageMetric"("date", "page");
CREATE INDEX "BingPageMetric_date_idx" ON "BingPageMetric"("date");
CREATE INDEX "BingPageMetric_page_idx" ON "BingPageMetric"("page");

-- CreateIndex
CREATE UNIQUE INDEX "BingQueryMetric_date_query_key" ON "BingQueryMetric"("date", "query");
CREATE INDEX "BingQueryMetric_date_idx" ON "BingQueryMetric"("date");
CREATE INDEX "BingQueryMetric_query_idx" ON "BingQueryMetric"("query");

-- CreateIndex
CREATE INDEX "BingAlert_date_idx" ON "BingAlert"("date");
CREATE INDEX "BingAlert_severity_idx" ON "BingAlert"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "BingSiteSummary_date_key" ON "BingSiteSummary"("date");
