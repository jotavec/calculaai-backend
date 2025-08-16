# Checklist de Rotação de Segredos - CalculaAI Backend

Este documento contém o checklist para rotacionar segredos e tokens de segurança do backend em produção.

## Frequência Recomendada
- **JWT_SECRET**: A cada 3-6 meses ou imediatamente se comprometido
- **DATABASE_URL**: Anualmente ou se comprometido
- **Tokens de terceiros**: Conforme política de cada serviço ou se comprometido

## 1. JWT_SECRET

### Checklist:
- [ ] **Gerar novo JWT_SECRET**
  - [ ] Criar string aleatória segura (mínimo 64 caracteres)
  - [ ] Comando sugerido: `openssl rand -base64 64`

- [ ] **Aplicar no ambiente de produção**
  - [ ] Atualizar variável `JWT_SECRET` no servidor/PM2/Docker
  - [ ] Reiniciar aplicação para carregar nova variável

- [ ] **Coordenar com frontend**
  - [ ] Avisar equipe frontend sobre janela de manutenção
  - [ ] Todos os usuários precisarão fazer login novamente
  - [ ] Considerar implementar rotação gradual se necessário

- [ ] **Validar funcionamento**
  - [ ] Testar login/logout
  - [ ] Verificar autenticação em endpoints protegidos
  - [ ] Monitorar logs por 24h após mudança

## 2. DATABASE_URL (Credenciais do Banco)

### Checklist:
- [ ] **No provedor de banco (AWS RDS, etc.)**
  - [ ] Criar novo usuário com mesmas permissões
  - [ ] Ou alterar senha do usuário existente
  - [ ] Anotar nova string de conexão

- [ ] **Atualizar aplicação**
  - [ ] Substituir `DATABASE_URL` no ambiente de produção
  - [ ] Reiniciar aplicação
  - [ ] Verificar conectividade com banco

- [ ] **Remover credenciais antigas**
  - [ ] Aguardar 24-48h para estabilidade
  - [ ] Remover usuário antigo ou revogar senha antiga
  - [ ] Documentar mudança

- [ ] **Backup e teste**
  - [ ] Verificar se backups continuam funcionando
  - [ ] Testar restore de backup se possível

## 3. Tokens de Terceiros

### 3.1 Mercado Pago
- [ ] **No painel do Mercado Pago**
  - [ ] Acessar configurações de aplicação
  - [ ] Gerar novos tokens (Public Key e Access Token)
  - [ ] Anotar novos valores

- [ ] **Atualizar no servidor**
  - [ ] `MERCADOPAGO_PUBLIC_KEY`
  - [ ] `MERCADOPAGO_ACCESS_TOKEN`
  - [ ] Reiniciar aplicação

- [ ] **Revogar tokens antigos**
  - [ ] No painel do Mercado Pago, revogar tokens anteriores
  - [ ] Testar fluxo de pagamento completo

### 3.2 SMTP (Email)
- [ ] **No provedor de email**
  - [ ] Gerar nova senha de aplicação
  - [ ] Ou criar novo usuário SMTP

- [ ] **Atualizar variáveis**
  - [ ] `SMTP_USER` (se mudou usuário)
  - [ ] `SMTP_PASS`
  - [ ] Reiniciar aplicação

- [ ] **Validar envio**
  - [ ] Testar envio de emails (sugestões, notificações)
  - [ ] Verificar entrega e spam

### 3.3 R2/S3 (Cloudflare R2)
- [ ] **No painel do Cloudflare**
  - [ ] Criar novo token API
  - [ ] Configurar mesmas permissões (leitura/escrita bucket)

- [ ] **Atualizar credenciais**
  - [ ] `R2_ACCESS_KEY_ID`
  - [ ] `R2_SECRET_ACCESS_KEY`
  - [ ] Reiniciar aplicação

- [ ] **Testar upload/download**
  - [ ] Upload de avatar de usuário
  - [ ] Acesso a arquivos existentes
  - [ ] Revogar token antigo

## 4. Procedimento Geral

### Antes da Rotação:
- [ ] Agendar janela de manutenção (fora do horário de pico)
- [ ] Fazer backup completo do banco de dados
- [ ] Notificar usuários se necessário (especialmente para JWT)
- [ ] Preparar rollback plan

### Durante a Rotação:
- [ ] Seguir checklist específico do segredo
- [ ] Monitorar logs em tempo real
- [ ] Ter equipe disponível para rollback se necessário

### Após a Rotação:
- [ ] Verificar funcionamento de todas as funcionalidades
- [ ] Monitorar métricas por 24-48h
- [ ] Documentar data da rotação
- [ ] Atualizar próxima data de rotação no calendário

## 5. Emergência - Segredo Comprometido

Se algum segredo for comprometido:

1. **Ação imediata** (< 30 minutos):
   - [ ] Revogar/invalidar segredo comprometido no provedor
   - [ ] Gerar novo segredo
   - [ ] Aplicar novo segredo na aplicação

2. **Análise** (< 2 horas):
   - [ ] Investigar como foi comprometido
   - [ ] Verificar logs de acesso suspeito
   - [ ] Avaliar impacto nos usuários

3. **Comunicação**:
   - [ ] Notificar stakeholders internos
   - [ ] Se necessário, comunicar usuários afetados
   - [ ] Documentar incidente e lições aprendidas

## 6. Contatos de Emergência

- **DevOps/Infraestrutura**: [adicionar contato]
- **Desenvolvedor Principal**: [adicionar contato]
- **Suporte Mercado Pago**: [adicionar contato]
- **Suporte Cloudflare**: [adicionar contato]

---

**Última atualização**: Dezembro 2024  
**Próxima revisão**: Março 2025