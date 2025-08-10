-- CreateTable
CREATE TABLE "BlocoAtivos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blocoId" TEXT NOT NULL,
    "ativos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlocoAtivos_pkey" PRIMARY KEY ("id")
);
