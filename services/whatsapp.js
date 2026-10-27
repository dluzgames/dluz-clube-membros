const https = require('https');
const db = require('./database');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution.dluz.com.br/message/sendText/frya';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

const DOWNLOAD_ZIP_URL = 'https://github.com/dluzgames/DLuzMobiladorPlus/releases/download/v2.5.0/DLuzMobiladorPlus_v2.5_Portatil.zip';
const DOWNLOAD_EXE_URL = 'https://github.com/dluzgames/DLuzMobiladorPlus/releases/download/v2.5.0/DLuzMobiladorPlus_Instalador.exe';

function requestHttps(urlStr, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DLuz-WhatsApp-Service/1.0',
        ...(options.headers || {})
      },
      rejectUnauthorized: false
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function formatPhoneNumber(phone) {
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }
  return clean;
}

/**
 * Envia mensagem oficial com a Chave e links no WhatsApp do Membro
 */
async function sendKeyToMemberWhatsApp(phone, memberName, licenseKey, tierName = 'Nível 3+') {
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length < 12) {
    throw new Error('Número de WhatsApp inválido. Digite DDD + Número.');
  }

  const firstName = memberName ? memberName.split(' ')[0] : 'Melhor';

  const message = `🔥 *FALA, ${firstName.toUpperCase()}! BELEZA?*

Muito obrigado por apoiar o canal como *Membro VIP (${tierName})* no YouTube! Como prometido, aqui está o seu benefício exclusivo:

🔑 *SUA CHAVE PRO OFICIAL:*
\`\`\`${licenseKey}\`\`\`

*(Válida enquanto você mantiver sua assinatura ativa no canal!)*

---
🚀 *LINKS DE DOWNLOAD OFICIAL (VERSÃO 2.5):*

📦 *Versão Portátil (.zip — Zero Instalação):*
${DOWNLOAD_ZIP_URL}

⚙️ *Instalador Oficial (.exe):*
${DOWNLOAD_EXE_URL}

---
💡 *COMO ATIVAR NO DLUZMOBILADOR PLUS:*
1. Baixe e abra o aplicativo.
2. Na tela de ativação, cole a sua chave acima.
3. Clique em *Ativar* e pronto! Aproveite a taxa de 120 FPS e Zero Delay!

Precisando de qualquer suporte, conte com a gente. Tmj e bom jogo! 🎮⚡`;

  if (process.env.DEMO_MODE === 'true') {
    console.log(`[WhatsAppService] MODO DEMO - Mensagem simulada para ${formattedPhone}:\n${message}`);
    return { success: true, demo: true, phone: formattedPhone };
  }

  const payload = JSON.stringify({
    number: formattedPhone,
    text: message
  });

  try {
    const res = await requestHttps(EVOLUTION_API_URL, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    }, payload);

    return {
      success: res.status >= 200 && res.status < 300,
      data: res.data
    };
  } catch (error) {
    console.error('[WhatsAppService] Falha ao enviar mensagem:', error.message);
    throw error;
  }
}

module.exports = {
  sendKeyToMemberWhatsApp,
  formatPhoneNumber
};
