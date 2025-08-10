-- CreateTable
CREATE TABLE "TipoProduto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipoProduto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TipoProduto" ADD CONSTRAINT "TipoProduto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
