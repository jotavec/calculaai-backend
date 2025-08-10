-- CreateTable
CREATE TABLE "Bloco" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "lucro" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bloco_pkey" PRIMARY KEY ("id")
);
