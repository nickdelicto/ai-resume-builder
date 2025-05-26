-- CreateTable
CREATE TABLE "KVStore" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KVStore_pkey" PRIMARY KEY ("key")
);
