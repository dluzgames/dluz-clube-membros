require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const db = require('./services/database');
const youtubeService = require('./services/youtube');
const licenseService = require('./services/license');
const whatsappService = require('./services/whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_COOKIE = 'dluz_member_session';
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET || 'dluz_fallback_session_key'));
app.use(express.static(path.join(__dirname, 'public')));

// Helper de Sessão
function getSessionUser(req) {
  try {
    const raw = req.signedCookies[SESSION_COOKIE];
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setSessionUser(res, userData) {
  res.cookie(SESSION_COOKIE, JSON.stringify(userData), {
    httpOnly: true,
    signed: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
  });
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO (GOOGLE / YOUTUBE)
// ==========================================

// Iniciar login com o Google
app.get('/auth/google', (req, res) => {
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
  const url = youtubeService.getGoogleAuthUrl(redirectUri);
  res.redirect(url);
});

// Callback do Google OAuth
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;

  if (!code) {
    return res.redirect('/?error=auth_cancelled');
  }

  try {
    const tokens = await youtubeService.exchangeCodeForTokens(code, redirectUri);
    const profile = await youtubeService.getUserYouTubeProfile(tokens.access_token);

    // Salva perfil na sessão
    setSessionUser(res, {
      channelId: profile.channelId,
      displayName: profile.displayName,
      avatar: profile.avatar,
      email: profile.email
    });

    res.redirect('/');
  } catch (error) {
    console.error('[AuthCallback] Erro no login:', error.message);
    res.redirect('/?error=auth_failed');
  }
});

// Logout
app.get('/auth/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.redirect('/');
});

// Login Rápido de Demonstração (Permite testar os 3 cenários instantaneamente)
app.get('/auth/demo', (req, res) => {
  const scenario = req.query.scenario || 'tier3';

  if (scenario === 'tier3') {
    const mockChannelId = 'UC_demo_membro_nivel3_vip';
    db.upsertMember({
      youtube_channel_id: mockChannelId,
      display_name: 'Canal Gamer VIP (Membro Nível 3)',
      profile_image_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
      email: 'membro.vip@gmail.com',
      tier_id: 'tier_ouro_3',
      tier_name: 'Nível 3 — Membro Ouro / Elite',
      tier_level: 3,
      member_since: '2026-02-10T10:00:00.000Z',
      is_active: 1
    });

    setSessionUser(res, {
      channelId: mockChannelId,
      displayName: 'Canal Gamer VIP',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
      email: 'membro.vip@gmail.com'
    });
  } else if (scenario === 'tier1') {
    const mockChannelId = 'UC_demo_membro_nivel1_bronze';
    db.upsertMember({
      youtube_channel_id: mockChannelId,
      display_name: 'Inscrito Iniciante (Membro Nível 1)',
      profile_image_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      email: 'membro.bronze@gmail.com',
      tier_id: 'tier_bronze_1',
      tier_name: 'Nível 1 — Apoiador Básico',
      tier_level: 1,
      member_since: '2026-08-01T10:00:00.000Z',
      is_active: 1
    });

    setSessionUser(res, {
      channelId: mockChannelId,
      displayName: 'Inscrito Iniciante',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      email: 'membro.bronze@gmail.com'
    });
  } else if (scenario === 'not_member') {
    const mockChannelId = 'UC_demo_nao_membro_visitante';
    setSessionUser(res, {
      channelId: mockChannelId,
      displayName: 'Visitante Não-Membro',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      email: 'visitante@gmail.com'
    });
  }

  res.redirect('/');
});

// ==========================================
// ROTAS DE API DO MEMBRO
// ==========================================

// Dados do Usuário Logado & Status de Membro
app.get('/api/me', async (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.json({ authenticated: false });
  }

  const eligibility = await youtubeService.checkMemberEligibility(session.channelId);
  const existingLicense = db.getLicenseByChannelId(session.channelId);

  res.json({
    authenticated: true,
    user: session,
    status: eligibility.status, // 'eligible' (>=3), 'needs_upgrade' (<3), 'not_member'
    member: eligibility.member,
    license: existingLicense ? {
      key: existingLicense.license_key,
      productName: existingLicense.product_name,
      status: existingLicense.status,
      assignedAt: existingLicense.assigned_at
    } : null,
    downloads: {
      zip: 'https://github.com/dluzgames/DLuzMobiladorPlus/releases/download/v2.5.0/DLuzMobiladorPlus_v2.5_Portatil.zip',
      exe: 'https://github.com/dluzgames/DLuzMobiladorPlus/releases/download/v2.5.0/DLuzMobiladorPlus_Instalador.exe'
    }
  });
});

// Resgatar / Gerar a Chave de Membro
app.post('/api/member/claim', async (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ error: 'Você precisa fazer login com o YouTube.' });
  }

  const eligibility = await youtubeService.checkMemberEligibility(session.channelId);

  if (eligibility.status === 'not_member') {
    return res.status(403).json({ error: 'Você não possui assinatura ativa de membro no canal.' });
  }

  if (eligibility.status === 'needs_upgrade') {
    return res.status(403).json({
      error: 'Benefício exclusivo para Membros a partir do Nível 3! Faça upgrade no canal para resgatar.'
    });
  }

  try {
    const member = eligibility.member;
    const licenseResult = await licenseService.claimOrGetMemberKey(member);

    res.json({
      success: true,
      key: licenseResult.key,
      isNew: licenseResult.isNew,
      productName: licenseResult.productName,
      assignedAt: licenseResult.assignedAt,
      message: licenseResult.isNew ? 'Chave oficial gerada com sucesso!' : 'Sua chave ativa foi recuperada!'
    });
  } catch (error) {
    console.error('[ClaimKey] Erro ao resgatar chave:', error.message);
    res.status(500).json({ error: 'Não foi possível gerar a chave no momento. Tente novamente em instantes.' });
  }
});

// Enviar Chave para o WhatsApp do Membro
app.post('/api/member/send-whatsapp', async (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Informe o número do WhatsApp com DDD.' });
  }

  const license = db.getLicenseByChannelId(session.channelId);
  if (!license) {
    return res.status(400).json({ error: 'Você ainda não resgatou sua chave oficial.' });
  }

  const member = db.getMemberByChannelId(session.channelId);
  const tierName = member ? member.tier_name : 'Nível 3+';

  try {
    // Atualiza o telefone do membro no banco
    db.updateMemberPhone(session.channelId, phone);

    await whatsappService.sendKeyToMemberWhatsApp(phone, session.displayName, license.license_key, tierName);

    res.json({
      success: true,
      message: `Chave e links oficiais enviados com sucesso para o WhatsApp!`
    });
  } catch (error) {
    console.error('[SendWhatsApp] Erro no envio:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao enviar WhatsApp.' });
  }
});

// ==========================================
// ROTAS ADMINISTRATIVAS & SINCRONIZAÇÃO
// ==========================================

// Painel administrativo para checagem
app.get('/api/admin/members', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const members = db.getAllMembers();
  res.json({
    total: members.length,
    active: members.filter(m => m.is_active === 1).length,
    tier3Plus: members.filter(m => m.is_active === 1 && m.tier_level >= 3).length,
    members
  });
});

// Disparar sincronização manual com o YouTube
app.post('/api/admin/sync', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    const result = await youtubeService.syncMembers();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configurar Token do Criador
app.post('/api/admin/config-creator-token', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken obrigatório.' });
  }

  db.setConfig('creator_refresh_token', refreshToken);
  res.json({ success: true, message: 'Refresh token do canal configurado com sucesso!' });
});

// ==========================================
// AGENDAMENTO CRON (SINCRONIZAÇÃO A CADA 6H)
// ==========================================
cron.schedule('0 */6 * * *', async () => {
  console.log('[Cron] Executando rotina periódica de verificação de membros do YouTube...');
  try {
    await youtubeService.syncMembers();
  } catch (err) {
    console.error('[Cron] Falha na sincronização periódica:', err.message);
  }
});

// Inicia Servidor
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 DLuz Clube de Membros rodando na porta ${PORT}`);
  console.log(`🌐 URL Local: http://localhost:${PORT}`);
  console.log(`👑 Regra Ativa: Elegibilidade apenas para Nível 3 ou superior`);
  console.log(`=================================================\n`);
});
