-- CreateTable
CREATE TABLE "CategoriaNutricional" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaNutricional_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CategoriaNutricional" ADD CONSTRAINT "CategoriaNutricional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
