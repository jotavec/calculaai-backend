-- CreateTable
CREATE TABLE "SaidaEstoque" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "userId" TEXT,
    "data" TIMESTAMP(3),

    CONSTRAINT "SaidaEstoque_pkey" PRIMARY KEY ("id")
);
