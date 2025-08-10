/*
  Warnings:

  - You are about to drop the `EncargoVenda` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EncargoVenda" DROP CONSTRAINT "EncargoVenda_userId_fkey";

-- DropTable
DROP TABLE "EncargoVenda";

-- CreateTable
CREATE TABLE "EncargosSobreVenda" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncargosSobreVenda_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EncargosSobreVenda" ADD CONSTRAINT "EncargosSobreVenda_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
