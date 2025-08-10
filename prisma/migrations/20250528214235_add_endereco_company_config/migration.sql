/*
  Warnings:

  - You are about to drop the column `address` on the `CompanyConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CompanyConfig" DROP COLUMN "address",
ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "estado" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "rua" TEXT;
