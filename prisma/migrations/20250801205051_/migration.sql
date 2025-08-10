/*
  Warnings:

  - You are about to drop the column `usarSubReceita` on the `Recipe` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "usarSubReceita",
ADD COLUMN     "blocoMarkupAtivo" TEXT;
