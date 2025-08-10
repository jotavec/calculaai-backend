/*
  Warnings:

  - You are about to drop the column `createdAt` on the `CategoriaNutricional` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CategoriaNutricional` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CategoriaNutricional" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- CreateTable
CREATE TABLE "ProdutoRotuloNutricional" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "categoriaNutricionalId" TEXT NOT NULL,
    "quantidade" TEXT NOT NULL,
    "vd" TEXT,

    CONSTRAINT "ProdutoRotuloNutricional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoRotuloNutricional_produtoId_categoriaNutricionalId_key" ON "ProdutoRotuloNutricional"("produtoId", "categoriaNutricionalId");

-- AddForeignKey
ALTER TABLE "ProdutoRotuloNutricional" ADD CONSTRAINT "ProdutoRotuloNutricional_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoRotuloNutricional" ADD CONSTRAINT "ProdutoRotuloNutricional_categoriaNutricionalId_fkey" FOREIGN KEY ("categoriaNutricionalId") REFERENCES "CategoriaNutricional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
