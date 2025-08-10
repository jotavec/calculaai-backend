/*
  Warnings:

  - You are about to drop the column `percent` on the `EncargoVenda` table. All the data in the column will be lost.
  - You are about to drop the column `valorReais` on the `EncargoVenda` table. All the data in the column will be lost.
  - Added the required column `valor` to the `EncargoVenda` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EncargoVenda" DROP COLUMN "percent",
DROP COLUMN "valorReais",
ADD COLUMN     "valor" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Funcionario" ALTER COLUMN "salario" SET DATA TYPE TEXT,
ALTER COLUMN "totalHorasMes" SET DATA TYPE TEXT,
ALTER COLUMN "fgts" SET DATA TYPE TEXT,
ALTER COLUMN "inss" SET DATA TYPE TEXT,
ALTER COLUMN "rat" SET DATA TYPE TEXT,
ALTER COLUMN "ferias13" SET DATA TYPE TEXT,
ALTER COLUMN "valeTransporte" SET DATA TYPE TEXT,
ALTER COLUMN "valeAlimentacao" SET DATA TYPE TEXT,
ALTER COLUMN "valeRefeicao" SET DATA TYPE TEXT,
ALTER COLUMN "planoSaude" SET DATA TYPE TEXT,
ALTER COLUMN "outros" SET DATA TYPE TEXT,
ALTER COLUMN "fgtsValor" SET DATA TYPE TEXT,
ALTER COLUMN "inssValor" SET DATA TYPE TEXT,
ALTER COLUMN "ratValor" SET DATA TYPE TEXT,
ALTER COLUMN "ferias13Valor" SET DATA TYPE TEXT,
ALTER COLUMN "valeTransporteValor" SET DATA TYPE TEXT,
ALTER COLUMN "valeAlimentacaoValor" SET DATA TYPE TEXT,
ALTER COLUMN "valeRefeicaoValor" SET DATA TYPE TEXT,
ALTER COLUMN "planoSaudeValor" SET DATA TYPE TEXT,
ALTER COLUMN "outrosValor" SET DATA TYPE TEXT;
