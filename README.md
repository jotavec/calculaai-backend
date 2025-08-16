# CalculaAI Backend

Backend API para o sistema CalculaAI - Plataforma de precificação e cálculo de custos.

## 🔧 Scripts Disponíveis

### Desenvolvimento
- `npm run dev` - Inicia o servidor em modo desenvolvimento com nodemon
- `npm start` - Inicia o servidor em modo produção

### Testes
- `npm test` - Executa todos os testes
- `npm run test:domains` - Executa apenas os testes de configuração de domínio

### Utilitários
- `npm run find-domains` - Busca todas as referências ao domínio calculaaiabr.com no código

## 🌐 Configuração de Domínio

Este projeto utiliza o domínio `calculaaiabr.com` em várias configurações. Para facilitar a manutenção, foram criadas ferramentas específicas:

### Arquivo de Documentação
- **`DOMAIN_REFERENCES.md`** - Documentação completa de todas as referências ao domínio

### Script de Busca
- **`scripts/find-domain-references.sh`** - Script que localiza todas as ocorrências do domínio no código
- Execute com: `npm run find-domains`

### Testes de Configuração
- **`__tests__/domain-config.test.js`** - Testes que validam a consistência das configurações de domínio
- Execute com: `npm run test:domains`

### Variáveis de Ambiente (arquivo .env)
```env
FRONTEND_ORIGIN="https://app.calculaaiabr.com"
FRONTEND_URL="https://app.calculaaiabr.com"
COOKIE_DOMAIN=.calculaaiabr.com
MP_RETURN_URL="https://app.calculaaiabr.com/pagamento/retorno"
```

## 🛠️ Instalação

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente no arquivo `.env`
4. Execute os testes para verificar se tudo está funcionando:
   ```bash
   npm test
   ```

## 📋 Manutenção de Domínio

Quando for necessário alterar o domínio:

1. **Localize todas as referências**: `npm run find-domains`
2. **Verifique os testes**: `npm run test:domains`
3. **Consulte a documentação**: `DOMAIN_REFERENCES.md`
4. **Atualize as configurações** necessárias
5. **Execute os testes** novamente para garantir consistência

## 🔐 Segurança

- Todas as URLs usam HTTPS
- Cookies configurados com domínio principal para compartilhamento entre subdomínios
- CORS configurado apenas para origens autorizadas

---

Para mais detalhes sobre configurações de domínio, consulte `DOMAIN_REFERENCES.md`.