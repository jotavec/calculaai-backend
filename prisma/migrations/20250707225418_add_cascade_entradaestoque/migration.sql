-- DropForeignKey
ALTER TABLE "EntradaEstoque" DROP CONSTRAINT "EntradaEstoque_produtoId_fkey";

-- AddForeignKey
ALTER TABLE "EntradaEstoque" ADD CONSTRAINT "EntradaEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
