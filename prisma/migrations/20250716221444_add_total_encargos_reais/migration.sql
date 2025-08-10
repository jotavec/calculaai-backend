/*
  Warnings:

  - You are about to drop the column `taxaExtra` on the `Bloco` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bloco" DROP COLUMN "taxaExtra",
ADD COLUMN     "totalEncargosReais" DOUBLE PRECISION DEFAULT 0;
