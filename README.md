# 👑 DLuz Clube de Membros — Sistema Automatizado (Sem Discord)

Sistema autônomo e profissional para entrega e gestão automática de licenças (DLuzMobilador Plus Pro e softwares) para membros do canal **Joga DLuz** no YouTube, eliminando totalmente a dependência do Discord.

---

## ⚡ Como Funciona

1. **Login com YouTube (Google OAuth 2.0):**
   - O membro entra no portal (ex: `membros.dluz.com.br`) e faz login com 1 clique usando sua conta Google/YouTube.
2. **Checagem de Nível (YouTube Data API v3):**
   - **Nível 3 ou Superior:** Acesso liberado! Chave oficial gerada e exibida na tela.
   - **Nível 1 ou 2:** Alerta amigável de upgrade para Nível 3 com link direto do YouTube.
   - **Não-Membro:** Convite com link para se tornar membro.
3. **Entrega da Chave:**
   - Exibição na tela com botão de copiar em 1 clique.
   - Links diretos do instalador (.exe) e versão portátil (.zip).
   - Envio automático para o WhatsApp do membro via Evolution/Baileys API.
4. **Validade & Cancelamento:**
   - A licença é válida exclusivamente enquanto o membro mantiver a assinatura ativa.
   - Um cron job roda periodicamente sincronizando a lista de membros do YouTube. Se o membro cancelou a assinatura, a chave é revogada automaticamente no sistema.

---

## 🚀 Como Rodar Localmente

```bash
# 1. Entrar na pasta
cd "C:\Users\dluzgg\.gemini\antigravity\scratch\dluz-clube-membros"

# 2. Instalar dependências (já instaladas)
npm install

# 3. Iniciar o servidor
npm start
```
O portal estará acessível em: `http://localhost:3000`

---

## 🧪 Como Testar no Navegador

Ao abrir `http://localhost:3000`, use a barra inferior **"Testar Cenários"**:
- **👑 Nível 3 (VIP):** Simula um membro Ouro/Elite com resgate de chave liberado.
- **🥉 Nível 1:** Simula um membro de nível inferior com aviso de upgrade.
- **❌ Não-Membro:** Simula um visitante comum.
- **Deslogar:** Volta para a página inicial de visitante.

---

## 🐳 Como Subir no Coolify (`membros.dluz.com.br`)

1. Crie uma nova aplicação no Coolify (**Docker Compose** ou **Dockerfile**).
2. Aponte o repositório ou faça o build a partir do diretório.
3. Configure o domínio público: `https://membros.dluz.com.br`.
4. Mapeie o volume persistente para o banco SQLite:
   - Volume: `membros_data:/app/data`
5. Configure as variáveis de ambiente baseadas no `.env.example`.
