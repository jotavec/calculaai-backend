/*
  Warnings:

  - You are about to drop the column `lucro` on the `Bloco` table. All the data in the column will be lost.
  - You are about to drop the column `lote` on the `SaidaEstoque` table. All the data in the column will be lost.
  - You are about to drop the column `validade` on the `SaidaEstoque` table. All the data in the column will be lost.
  - You are about to drop the column `valor` on the `SaidaEstoque` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SaidaEstoque" DROP CONSTRAINT "SaidaEstoque_produtoId_fkey";

-- DropForeignKey
ALTER TABLE "SaidaEstoque" DROP CONSTRAINT "SaidaEstoque_userId_fkey";

-- AlterTable
ALTER TABLE "Bloco" DROP COLUMN "lucro",
ADD COLUMN     "markup" TEXT;

-- AlterTable
ALTER TABLE "SaidaEstoque" DROP COLUMN "lote",
DROP COLUMN "validade",
DROP COLUMN "valor";
