-- CreateTable
CREATE TABLE "SalesResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SalesResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SalesResult" ADD CONSTRAINT "SalesResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
