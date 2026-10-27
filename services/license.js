const https = require('https');
const db = require('./database');

const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://lf7k749dplzo1qaa2au0izl1.dluz.com.br/api/webhook/woocommerce';
const PRODUCT_ID = parseInt(process.env.MEMBER_PRODUCT_ID || '2755', 10);
const PRODUCT_NAME = process.env.MEMBER_PRODUCT_NAME || 'DLuzMobilador Pro — Clube de Membros (Nível 3+)';

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
        'User-Agent': 'DLuz-Membros-Manager/1.0',
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

/**
 * Resgata a chave ativa existente ou gera uma nova no Servidor de Licenças
 */
async function claimOrGetMemberKey(member) {
  // 1. Verifica se já tem chave ativa salva no banco de dados local
  const existingLicense = db.getLicenseByChannelId(member.youtube_channel_id);
  if (existingLicense) {
    return {
      success: true,
      key: existingLicense.license_key,
      isNew: false,
      productName: existingLicense.product_name,
      assignedAt: existingLicense.assigned_at
    };
  }

  // Se estiver em modo demonstração local sem conexão com servidor de licença
  if (process.env.DEMO_MODE === 'true') {
    const mockKey = `DLUZ-MBR3-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    db.saveLicense(member.youtube_channel_id, mockKey, PRODUCT_NAME);
    return {
      success: true,
      key: mockKey,
      isNew: true,
      productName: PRODUCT_NAME,
      assignedAt: new Date().toISOString()
    };
  }

  // 2. Monta o payload de pedido WooCommerce para o Servidor de Licenças DLuz
  const cleanChannelId = member.youtube_channel_id.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
  const payload = JSON.stringify({
    id: `MBR-${cleanChannelId}-${Date.now().toString().slice(-6)}`,
    status: 'completed',
    billing: {
      first_name: member.display_name.split(' ')[0] || 'Membro',
      last_name: member.display_name.split(' ').slice(1).join(' ') || 'VIP',
      email: member.email || `${member.youtube_channel_id}@membros.dluz.com.br`,
      phone: member.phone || ''
    },
    line_items: [
      {
        id: PRODUCT_ID,
        name: PRODUCT_NAME,
        product_id: PRODUCT_ID,
        quantity: 1
      }
    ]
  });

  try {
    const res = await requestHttps(LICENSE_SERVER_URL, { method: 'POST' }, payload);

    if (res.data && res.data.key) {
      const generatedKey = res.data.key;
      db.saveLicense(member.youtube_channel_id, generatedKey, PRODUCT_NAME);
      return {
        success: true,
        key: generatedKey,
        isNew: true,
        productName: PRODUCT_NAME,
        assignedAt: new Date().toISOString()
      };
    }

    throw new Error(`Servidor de Licenças retornou resposta inválida: ${JSON.stringify(res.data)}`);
  } catch (error) {
    console.error('[LicenseService] Erro ao comunicar com o servidor de licenças:', error.message);
    throw error;
  }
}

/**
 * Revoga a licença do membro caso ele cancele a assinatura no YouTube
 */
async function revokeMemberLicense(youtubeChannelId) {
  const existingLicense = db.getLicenseByChannelId(youtubeChannelId);
  if (!existingLicense) return false;

  console.log(`[LicenseService] Revogando chave ${existingLicense.license_key} do canal ${youtubeChannelId}...`);
  db.revokeLicense(youtubeChannelId);

  // Aqui podemos adicionalmente notificar o servidor de licenças caso haja endpoint de cancelamento
  return true;
}

module.exports = {
  claimOrGetMemberKey,
  revokeMemberLicense
};
