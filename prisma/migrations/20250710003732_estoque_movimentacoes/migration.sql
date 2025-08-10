-- AlterTable
ALTER TABLE "SaidaEstoque" ADD COLUMN     "lote" TEXT,
ADD COLUMN     "validade" TIMESTAMP(3),
ADD COLUMN     "valor" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "SaidaEstoque" ADD CONSTRAINT "SaidaEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaidaEstoque" ADD CONSTRAINT "SaidaEstoque_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
