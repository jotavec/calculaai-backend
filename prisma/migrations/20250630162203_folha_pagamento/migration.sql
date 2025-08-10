-- CreateTable
CREATE TABLE "Funcionario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "tipoMaoDeObra" TEXT NOT NULL,
    "salario" TEXT NOT NULL,
    "totalHorasMes" TEXT NOT NULL,
    "fgts" TEXT NOT NULL,
    "inss" TEXT NOT NULL,
    "rat" TEXT NOT NULL,
    "ferias13" TEXT NOT NULL,
    "valeTransporte" TEXT NOT NULL,
    "valeAlimentacao" TEXT NOT NULL,
    "valeRefeicao" TEXT NOT NULL,
    "planoSaude" TEXT NOT NULL,
    "outros" TEXT NOT NULL,
    "fgtsValor" TEXT NOT NULL,
    "inssValor" TEXT NOT NULL,
    "ratValor" TEXT NOT NULL,
    "ferias13Valor" TEXT NOT NULL,
    "valeTransporteValor" TEXT NOT NULL,
    "valeAlimentacaoValor" TEXT NOT NULL,
    "valeRefeicaoValor" TEXT NOT NULL,
    "planoSaudeValor" TEXT NOT NULL,
    "outrosValor" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
