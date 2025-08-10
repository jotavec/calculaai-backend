-- Altera a tabela EncargoVenda: remove coluna "valor", adiciona "percent" e "valorReais"
ALTER TABLE "EncargoVenda" DROP COLUMN "valor";
ALTER TABLE "EncargoVenda" ADD COLUMN "percent" DOUBLE PRECISION;
ALTER TABLE "EncargoVenda" ADD COLUMN "valorReais" DOUBLE PRECISION;

-- Converte todas as colunas do Funcionario de String (text/varchar) para Float (double precision), mantendo os dados
ALTER TABLE "Funcionario" ALTER COLUMN "salario" TYPE double precision USING ("salario"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "totalHorasMes" TYPE double precision USING ("totalHorasMes"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "fgts" TYPE double precision USING ("fgts"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "inss" TYPE double precision USING ("inss"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "rat" TYPE double precision USING ("rat"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "ferias13" TYPE double precision USING ("ferias13"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "valeTransporte" TYPE double precision USING ("valeTransporte"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "valeAlimentacao" TYPE double precision USING ("valeAlimentacao"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "valeRefeicao" TYPE double precision USING ("valeRefeicao"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "planoSaude" TYPE double precision USING ("planoSaude"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "outros" TYPE double precision USING ("outros"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "fgtsValor" TYPE double precision USING ("fgtsValor"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "inssValor" TYPE double precision USING ("inssValor"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "ratValor" TYPE double precision USING ("ratValor"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "ferias13Valor" TYPE double precision USING ("ferias13Valor"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "valeTransporteValor" TYPE double precision USING ("valeTransporteValor"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "valeAlimentacaoValor" TYPE double precision USING ("valeAlimentacaoValor"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "valeRefeicaoValor" TYPE double precision USING ("valeRefeicaoValor"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "planoSaudeValor" TYPE double precision USING ("planoSaudeValor"::double precision);
ALTER TABLE "Funcionario" ALTER COLUMN "outrosValor" TYPE double precision USING ("outrosValor"::double precision);