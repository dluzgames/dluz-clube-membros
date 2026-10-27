const https = require('https');
const db = require('./database');
const licenseService = require('./license');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const CREATOR_CHANNEL_ID = process.env.CREATOR_CHANNEL_ID || 'UCowvrE3cNyiHcsMQRcQlp-w'; // Canal Joga DLuz
const CREATOR_REFRESH_TOKEN = process.env.CREATOR_REFRESH_TOKEN || '';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

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
        'User-Agent': 'DLuz-YouTube-Members-Manager/1.0',
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
 * Gera URL de autenticação Google OAuth para o membro fazer login
 */
function getGoogleAuthUrl(redirectUri) {
  const finalRedirect = redirectUri || `${APP_URL}/auth/callback`;
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: finalRedirect,
    client_id: GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/youtube.readonly'
    ].join(' ')
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

/**
 * Troca o código OAuth por tokens de acesso do usuário
 */
async function exchangeCodeForTokens(code, redirectUri) {
  const finalRedirect = redirectUri || `${APP_URL}/auth/callback`;
  const postBody = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: finalRedirect,
    grant_type: 'authorization_code'
  }).toString();

  const res = await requestHttps('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, postBody);

  if (res.status !== 200 || !res.data.access_token) {
    throw new Error(`Falha na troca de código OAuth: ${JSON.stringify(res.data)}`);
  }

  return res.data;
}

/**
 * Obtém os dados do canal do YouTube do usuário autenticado
 */
async function getUserYouTubeProfile(accessToken) {
  // 1. Dados básicos da conta Google
  const userInfoRes = await requestHttps('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const email = userInfoRes.data?.email || '';
  const googleName = userInfoRes.data?.name || 'Inscrito DLuz';
  const googlePicture = userInfoRes.data?.picture || '';

  // 2. Dados do canal do YouTube vinculado
  const ytRes = await requestHttps('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  let channelId = '';
  let channelTitle = googleName;
  let channelAvatar = googlePicture;

  if (ytRes.data?.items && ytRes.data.items.length > 0) {
    const item = ytRes.data.items[0];
    channelId = item.id;
    channelTitle = item.snippet?.title || googleName;
    channelAvatar = item.snippet?.thumbnails?.default?.url || googlePicture;
  } else {
    // Se não tiver canal próprio criado, usa identificador de usuário Google
    channelId = userInfoRes.data?.sub ? `user_${userInfoRes.data.sub}` : `anon_${Date.now()}`;
  }

  return {
    channelId,
    displayName: channelTitle,
    avatar: channelAvatar,
    email
  };
}

/**
 * Obtém token válido do canal criador para consultar lista de membros
 */
async function getCreatorAccessToken() {
  const refreshToken = CREATOR_REFRESH_TOKEN || db.getConfig('creator_refresh_token');
  if (!refreshToken) {
    return null;
  }

  const postBody = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  }).toString();

  const res = await requestHttps('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, postBody);

  if (res.status === 200 && res.data.access_token) {
    return res.data.access_token;
  }

  console.error('[YouTubeService] Erro ao renovar token do criador:', res.data);
  return null;
}

/**
 * Consulta a lista oficial de todos os membros do canal via YouTube Data API
 */
async function fetchAllCurrentMembersFromYouTube() {
  const token = await getCreatorAccessToken();
  if (!token) {
    console.warn('[YouTubeService] Token do criador não configurado. Verifique CREATOR_REFRESH_TOKEN.');
    return [];
  }

  let allMembers = [];
  let nextPageToken = null;

  try {
    do {
      let endpoint = `https://www.googleapis.com/youtube/v3/members?part=snippet&mode=all_current&maxResults=50`;
      if (nextPageToken) {
        endpoint += `&pageToken=${nextPageToken}`;
      }

      const res = await requestHttps(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status !== 200 || !res.data.items) {
        console.error('[YouTubeService] Falha ao consultar membros da API:', res.data);
        break;
      }

      for (const item of res.data.items) {
        const snippet = item.snippet;
        const memberDetails = snippet?.memberDetails;
        const memDetails = snippet?.membershipsDetails;

        // No YouTube Memberships, o array accessibleLevels contém todos os níveis que o membro tem acesso
        // Um membro nível 3 possui 3 ou mais níveis acessíveis
        const accessibleLevelsCount = memDetails?.accessibleLevels?.length || 1;
        const levelName = memDetails?.highestAccessibleLevelDisplayName || `Nível ${accessibleLevelsCount}`;

        // Verifica o nível (heurística pelo tamanho do array de níveis acessíveis ou número no nome)
        let tierLevel = accessibleLevelsCount;
        const matchNum = levelName.match(/(\d+)/);
        if (matchNum) {
          tierLevel = Math.max(tierLevel, parseInt(matchNum[1], 10));
        }

        allMembers.push({
          youtube_channel_id: memberDetails?.channelId,
          display_name: memberDetails?.displayName || 'Membro do Canal',
          profile_image_url: memberDetails?.profileImageUrl || '',
          tier_id: memDetails?.highestAccessibleLevel || '',
          tier_name: levelName,
          tier_level: tierLevel,
          member_since: memDetails?.membershipsDuration?.memberSince || new Date().toISOString(),
          is_active: 1
        });
      }

      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    return allMembers;
  } catch (error) {
    console.error('[YouTubeService] Erro na busca de membros:', error.message);
    return [];
  }
}

/**
 * Sincroniza membros do YouTube com o banco de dados e revoga cancelados
 */
async function syncMembers() {
  console.log('[YouTubeService] Iniciando sincronização periódica de membros...');
  const remoteMembers = await fetchAllCurrentMembersFromYouTube();

  if (remoteMembers.length === 0) {
    console.log('[YouTubeService] Nenhum membro retornado pela API ou token pendente.');
    db.logSync(0, 'skipped', 'API retornou 0 membros ou credencial não conectada');
    return { success: false, count: 0 };
  }

  const remoteChannelIds = new Set(remoteMembers.map(m => m.youtube_channel_id));

  // 1. Atualiza ou insere membros remotos no banco local
  for (const m of remoteMembers) {
    db.upsertMember(m);
  }

  // 2. Identifica membros ativos no banco que NÃO estão mais na lista do YouTube (cancelados)
  const currentDbMembers = db.getAllActiveMembers();
  let revokedCount = 0;

  for (const dbMem of currentDbMembers) {
    if (!remoteChannelIds.has(dbMem.youtube_channel_id)) {
      console.log(`[YouTubeService] Membro ${dbMem.display_name} (${dbMem.youtube_channel_id}) cancelou ou expirou! Desativando...`);
      db.setMemberActiveStatus(dbMem.youtube_channel_id, 0);
      await licenseService.revokeMemberLicense(dbMem.youtube_channel_id);
      revokedCount++;
    }
  }

  db.logSync(remoteMembers.length, 'success', `Sincronizados: ${remoteMembers.length}, Cancelados revogados: ${revokedCount}`);
  console.log(`[YouTubeService] Sincronização concluída com sucesso! Membros ativos: ${remoteMembers.length}`);

  return {
    success: true,
    totalMembers: remoteMembers.length,
    revokedCount
  };
}

/**
 * Valida a situação do membro logado:
 * Retorna status: 'eligible' (Nível >= 3), 'needs_upgrade' (Nível < 3) ou 'not_member'
 */
async function checkMemberEligibility(channelId) {
  // 1. Consulta banco local sincronizado
  let member = db.getMemberByChannelId(channelId);

  // Se não encontrar no banco ou membro estiver inativo, tenta sincronização pontual
  if (!member || !member.is_active) {
    // Se estiver em modo de teste, permite chave de demonstração
    if (process.env.DEMO_MODE === 'true' && channelId.startsWith('demo_')) {
      return {
        status: channelId.includes('tier1') ? 'needs_upgrade' : 'eligible',
        member: {
          youtube_channel_id: channelId,
          display_name: 'Membro Teste VIP',
          tier_name: channelId.includes('tier1') ? 'Nível 1 - Apoiador' : 'Nível 3 - Ouro / Elite',
          tier_level: channelId.includes('tier1') ? 1 : 3,
          is_active: 1
        }
      };
    }
    return { status: 'not_member', member: null };
  }

  if (member.tier_level >= 3) {
    return { status: 'eligible', member };
  } else {
    return { status: 'needs_upgrade', member };
  }
}

module.exports = {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getUserYouTubeProfile,
  fetchAllCurrentMembersFromYouTube,
  syncMembers,
  checkMemberEligibility
};
