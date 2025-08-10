/*
  Warnings:

  - You are about to drop the column `type` on the `SaleCharge` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `SaleCharge` table. All the data in the column will be lost.
  - Added the required column `fixedValue` to the `SaleCharge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `percentValue` to the `SaleCharge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SaleCharge" DROP COLUMN "type",
DROP COLUMN "value",
ADD COLUMN     "fixedValue" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "percentValue" DOUBLE PRECISION NOT NULL;
