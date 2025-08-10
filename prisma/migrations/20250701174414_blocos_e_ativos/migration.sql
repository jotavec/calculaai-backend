/*
  Warnings:

  - Added the required column `userId` to the `Bloco` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `blocoId` on the `BlocoAtivos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Bloco" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BlocoAtivos" DROP COLUMN "blocoId",
ADD COLUMN     "blocoId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Bloco" ADD CONSTRAINT "Bloco_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocoAtivos" ADD CONSTRAINT "BlocoAtivos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocoAtivos" ADD CONSTRAINT "BlocoAtivos_blocoId_fkey" FOREIGN KEY ("blocoId") REFERENCES "Bloco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
