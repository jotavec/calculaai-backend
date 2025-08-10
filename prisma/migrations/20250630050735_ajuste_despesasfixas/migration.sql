/*
  Warnings:

  - Added the required column `categoryId` to the `FixedCost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FixedCost" ADD COLUMN     "categoryId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "FixedCostCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedCostCategory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FixedCostCategory" ADD CONSTRAINT "FixedCostCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedCost" ADD CONSTRAINT "FixedCost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FixedCostCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
