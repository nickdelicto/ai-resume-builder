-- CreateTable
CREATE TABLE "GscPageMetric" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscPageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscQueryMetric" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "query" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscQueryMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscAlert" (
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

    CONSTRAINT "GscAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscSiteSummary" (
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

    CONSTRAINT "GscSiteSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GscPageMetric_date_page_key" ON "GscPageMetric"("date", "page");

-- CreateIndex
CREATE INDEX "GscPageMetric_date_idx" ON "GscPageMetric"("date");

-- CreateIndex
CREATE INDEX "GscPageMetric_page_idx" ON "GscPageMetric"("page");

-- CreateIndex
CREATE UNIQUE INDEX "GscQueryMetric_date_query_key" ON "GscQueryMetric"("date", "query");

-- CreateIndex
CREATE INDEX "GscQueryMetric_date_idx" ON "GscQueryMetric"("date");

-- CreateIndex
CREATE INDEX "GscQueryMetric_query_idx" ON "GscQueryMetric"("query");

-- CreateIndex
CREATE INDEX "GscAlert_date_idx" ON "GscAlert"("date");

-- CreateIndex
CREATE INDEX "GscAlert_severity_idx" ON "GscAlert"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "GscSiteSummary_date_key" ON "GscSiteSummary"("date");
