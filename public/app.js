// Gerenciador de Estado do Frontend
let appState = {
  authenticated: false,
  user: null,
  status: null, // 'eligible', 'needs_upgrade', 'not_member'
  member: null,
  license: null,
  downloads: null
};

// Toast de Notificação
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  
  const bg = type === 'success' 
    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
    : 'bg-rose-950/90 border-rose-500/50 text-rose-200';

  toast.className = `${bg} border px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-3 transition-all duration-300 transform translate-x-10 opacity-0 pointer-events-auto`;
  toast.innerHTML = `
    <span class="text-lg">${type === 'success' ? '✅' : '⚠️'}</span>
    <span class="text-sm font-medium">${message}</span>
  `;

  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('translate-x-10', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-10');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Inicialização
async function initApp() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    appState = data;
    renderApp();
  } catch (error) {
    console.error('Erro carregando estado:', error);
    renderError('Não foi possível conectar ao servidor. Tente recarregar a página.');
  }
}

// Renderização Principal
function renderApp() {
  const navContainer = document.getElementById('nav-user-container');
  const appContent = document.getElementById('app-content');

  // 1. Renderiza Header
  if (appState.authenticated && appState.user) {
    navContainer.innerHTML = `
      <div class="flex items-center space-x-3 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-2xl">
        <img src="${appState.user.avatar || 'https://via.placeholder.com/40'}" class="w-8 h-8 rounded-full border border-slate-700 object-cover" />
        <div class="hidden sm:block text-left">
          <p class="text-xs font-semibold text-slate-200 leading-tight">${appState.user.displayName}</p>
          <p class="text-[10px] text-slate-400">Canal Conectado</p>
        </div>
        <a href="/auth/logout" class="text-xs text-rose-400 hover:text-rose-300 ml-2 font-medium transition">Sair</a>
      </div>
    `;
  } else {
    navContainer.innerHTML = `
      <a href="/auth/google" class="inline-flex items-center space-x-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/25 transition">
        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        <span>Entrar com o YouTube</span>
      </a>
    `;
  }

  // 2. Renderiza Conteúdo Central baseado no estado
  if (!appState.authenticated) {
    renderLandingView(appContent);
  } else if (appState.status === 'eligible') {
    renderEligibleMemberView(appContent);
  } else if (appState.status === 'needs_upgrade') {
    renderNeedsUpgradeView(appContent);
  } else {
    renderNotMemberView(appContent);
  }
}

// Tela 1: Visitante (Não Autenticado)
function renderLandingView(container) {
  container.innerHTML = `
    <div class="w-full max-w-4xl flex flex-col items-center text-center space-y-8 py-6">
      
      <!-- Badge de Destaque -->
      <div class="inline-flex items-center space-x-2 bg-gradient-to-r from-[#ffd700]/15 to-[#ffaa00]/15 border border-[#ffd700]/30 px-4 py-1.5 rounded-full">
        <span class="w-2 h-2 rounded-full bg-[#ffd700] animate-ping"></span>
        <span class="text-xs font-bold text-[#ffd700] uppercase tracking-wider">Benefício Oficial para Membros VIP</span>
      </div>

      <!-- Título de Alto Impacto -->
      <div class="space-y-4 max-w-2xl">
        <h1 class="text-4xl sm:text-5xl md:text-6xl font-black font-heading tracking-tight text-white leading-tight">
          Softwares & Emuladores <br class="hidden sm:inline" />
          <span class="bg-gradient-to-r from-[#ffd700] via-[#ffe066] to-[#00f0ff] bg-clip-text text-transparent">Sem Esperar no Discord</span>
        </h1>
        <p class="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
          Se você apoia o canal <strong class="text-white font-semibold">Joga DLuz</strong> a partir do <strong class="text-[#ffd700] font-semibold">Nível 3</strong>, faça login com sua conta do YouTube para desbloquear o <strong class="text-white">DLuzMobilador Pro</strong> e o <strong class="text-[#00f0ff]">Emulador Orbix Linux</strong> imediatamente.
        </p>
      </div>

      <!-- Botão Principal de Login -->
      <div class="flex flex-col sm:flex-row items-center gap-4 pt-2">
        <a href="/auth/google" class="w-full sm:w-auto inline-flex items-center justify-center space-x-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-base sm:text-lg px-8 py-4 rounded-2xl shadow-xl shadow-red-600/30 hover:shadow-red-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all">
          <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          <span>Conectar Conta do YouTube</span>
        </a>
      </div>

      <!-- Grid de Benefícios -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 w-full pt-8 text-left">
        <div class="glass-panel p-6 rounded-2xl glass-card-hover border border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl mb-4 font-bold">
            🎮
          </div>
          <h3 class="font-heading font-bold text-lg text-white mb-1">DLuzMobilador Pro</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Windows 120 FPS cravado, sensibilidade 1:1 e zero delay para dominar no competitivo.
          </p>
        </div>

        <div class="glass-panel p-6 rounded-2xl glass-card-hover border border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xl mb-4 font-bold">
            🐧
          </div>
          <h3 class="font-heading font-bold text-lg text-white mb-1">Emulador Orbix Linux</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Arquitetura híbrida nativa no Linux. Zero aceleração de mouse, mapeamento BlueStacks e super leve.
          </p>
        </div>

        <div class="glass-panel p-6 rounded-2xl glass-card-hover border border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl mb-4 font-bold">
            ⚡
          </div>
          <h3 class="font-heading font-bold text-lg text-white mb-1">Chave Automática</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Sem moderador, sem fila e sem Discord. Chave liberada e enviada no seu WhatsApp na hora.
          </p>
        </div>
      </div>

    </div>
  `;
}

// Tela 2: Membro Elegível (Nível 3 ou superior)
function renderEligibleMemberView(container) {
  const member = appState.member;
  const license = appState.license;

  const orbixCurlCommand = "curl -fsSL https://membros.dluz.com.br/scripts/orbix-install.sh | bash";

  container.innerHTML = `
    <div class="w-full max-w-4xl flex flex-col space-y-6">
      
      <!-- Card do Membro VIP -->
      <div class="glass-panel p-6 rounded-3xl border border-[#ffd700]/30 shadow-xl shadow-[#ffd700]/5 flex flex-col sm:flex-row items-center sm:justify-between gap-4">
        <div class="flex items-center space-x-4">
          <img src="${appState.user.avatar || 'https://via.placeholder.com/80'}" class="w-16 h-16 rounded-2xl border-2 border-[#ffd700] object-cover shadow-lg" />
          <div class="text-left">
            <div class="flex items-center space-x-2">
              <h2 class="font-heading font-black text-2xl text-white">${appState.user.displayName}</h2>
              <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/40 uppercase">Ativo</span>
            </div>
            <p class="text-sm text-[#ffd700] font-semibold mt-0.5">👑 ${member.tier_name || 'Membro Nível 3'}</p>
            <p class="text-xs text-slate-400 mt-1">Apoiador do canal • Todos os Softwares Liberados</p>
          </div>
        </div>
      </div>

      <!-- Box de Chave de Licença Unificada -->
      <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 relative overflow-hidden">
        <div class="absolute -right-16 -top-16 w-48 h-48 bg-[#ffd700]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col space-y-4">
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-xs uppercase tracking-wider font-bold text-[#ffd700]">Benefício VIP Exclusivo</span>
              <span class="text-slate-600">•</span>
              <span class="text-xs text-slate-400">Válida para Windows & Linux</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-black font-heading text-white mt-1">Chave Oficial Pro — Clube de Membros</h2>
            <p class="text-xs sm:text-sm text-slate-400 mt-1">
              Ativa o <strong class="text-white">DLuzMobilador Pro</strong> e o <strong class="text-[#00f0ff]">Emulador Orbix Linux</strong> enquanto sua assinatura estiver ativa no canal.
            </p>
          </div>

          <!-- Estado da Key (Se já gerou ou se vai gerar agora) -->
          <div id="key-display-area" class="pt-2">
            ${license ? renderKeyDisplayHtml(license.key) : renderClaimButtonHtml()}
          </div>
        </div>
      </div>

      <!-- Grade dos 2 Softwares Liberados -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">

        <!-- Produto 1: DLuz Mobilador Pro (Windows) -->
        <div class="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-5">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                🎮
              </span>
              <span class="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40 uppercase">
                Windows 10 / 11
              </span>
            </div>

            <div>
              <h3 class="font-heading font-black text-xl text-white">DLuzMobilador Pro</h3>
              <p class="text-xs text-slate-400 mt-1">
                Zero Delay 120 FPS, mapeamento BlueStacks e controle absoluto via USB de alta velocidade.
              </p>
            </div>
          </div>

          <!-- Botões Windows -->
          <div class="space-y-2 pt-2">
            <a href="${appState.downloads.zip}" target="_blank" class="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition group">
              <div class="flex items-center space-x-3">
                <span class="text-lg">📦</span>
                <div class="text-left">
                  <p class="text-xs font-bold text-white group-hover:text-[#ffd700] transition">Versão Portátil (.zip)</p>
                  <p class="text-[10px] text-slate-400">Zero instalação • Extrair e jogar</p>
                </div>
              </div>
              <span class="text-slate-500 group-hover:text-white transition text-xs">Baixar ⬇️</span>
            </a>

            <a href="${appState.downloads.exe}" target="_blank" class="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition group">
              <div class="flex items-center space-x-3">
                <span class="text-lg">⚙️</span>
                <div class="text-left">
                  <p class="text-xs font-bold text-white group-hover:text-[#ffd700] transition">Instalador Oficial (.exe)</p>
                  <p class="text-[10px] text-slate-400">Instalação assistida no Windows</p>
                </div>
              </div>
              <span class="text-slate-500 group-hover:text-white transition text-xs">Baixar ⬇️</span>
            </a>
          </div>
        </div>

        <!-- Produto 2: Emulador Orbix (Linux) -->
        <div class="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-5">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xl">
                🐧
              </span>
              <span class="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-cyan-500/40 uppercase">
                Linux Nativo
              </span>
            </div>

            <div>
              <h3 class="font-heading font-black text-xl text-white">Emulador Orbix Linux</h3>
              <p class="text-xs text-slate-400 mt-1">
                Arquitetura híbrida para Ubuntu, Debian, Pop!_OS, Arch e Fedora. Sensibilidade 1:1 e zero aceleração.
              </p>
            </div>
          </div>

          <!-- Comando de Instalação Linux -->
          <div class="space-y-2 pt-2">
            <div class="bg-black/60 border border-slate-800 rounded-xl p-3 text-left">
              <p class="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Comando de Instalação (Terminal):</span>
                <span class="text-cyan-400 text-[10px]">1-Clique</span>
              </p>
              <div class="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-900 font-mono text-xs text-cyan-300 overflow-x-auto select-all">
                <code>${orbixCurlCommand}</code>
              </div>
            </div>

            <button 
              onclick="copyCommand('${orbixCurlCommand}')" 
              id="btn-copy-command"
              class="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition text-xs font-bold"
            >
              <span>📋 Copiar Comando do Terminal</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Card Enviar para WhatsApp -->
      <div class="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col space-y-4">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg">
            💬
          </div>
          <div>
            <h3 class="font-heading font-bold text-base text-white">Receber Chave & Links no WhatsApp</h3>
            <p class="text-xs text-slate-400">Receba a chave oficial, os links do Windows e os comandos do Linux direto no seu celular.</p>
          </div>
        </div>

        <form id="whatsapp-form" onsubmit="handleSendWhatsApp(event)" class="flex flex-col sm:flex-row gap-3">
          <input 
            type="tel" 
            id="whatsapp-phone" 
            placeholder="Seu WhatsApp com DDD (ex: 11999998888)" 
            class="flex-1 bg-slate-900 border border-slate-700 focus:border-[#ffd700] focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition"
            required
          />
          <button 
            type="submit" 
            id="btn-send-whatsapp"
            class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
          >
            <span>Enviar no Zap</span>
            <span>📲</span>
          </button>
        </form>
      </div>

    </div>
  `;
}

// Auxiliar: HTML da Chave Exibida
function renderKeyDisplayHtml(key) {
  return `
    <div class="flex flex-col sm:flex-row items-center gap-3 bg-black/40 border border-[#ffd700]/40 p-4 rounded-2xl">
      <div class="flex-1 font-mono text-center sm:text-left text-lg sm:text-xl font-black text-[#ffd700] tracking-wider select-all code-reveal">
        ${key}
      </div>
      <button 
        onclick="copyKey('${key}')" 
        id="btn-copy-key"
        class="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-[#ffd700] to-[#ffaa00] hover:from-[#ffe066] hover:to-[#ffd700] text-black font-extrabold text-xs uppercase px-5 py-3 rounded-xl shadow-lg shadow-[#ffd700]/20 hover:scale-[1.02] active:scale-[0.98] transition"
      >
        <span>📋 Copiar Chave</span>
      </button>
    </div>
  `;
}

// Auxiliar: HTML do Botão de Resgate Inicial
function renderClaimButtonHtml() {
  return `
    <div class="text-center py-4">
      <button 
        onclick="handleClaimKey()" 
        id="btn-claim-key"
        class="inline-flex items-center space-x-3 bg-gradient-to-r from-[#ffd700] to-[#ffaa00] hover:from-[#ffe066] hover:to-[#ffd700] text-black font-extrabold text-base px-8 py-4 rounded-2xl shadow-xl shadow-[#ffd700]/30 hover:scale-[1.02] active:scale-[0.98] transition"
      >
        <span>🔑 Resgatar Minha Chave PRO Agora</span>
      </button>
    </div>
  `;
}

// Tela 3: Membro Nível 1 ou 2 (Precisa de Upgrade para Nível 3)
function renderNeedsUpgradeView(container) {
  const member = appState.member;

  container.innerHTML = `
    <div class="w-full max-w-2xl flex flex-col space-y-6">
      
      <div class="glass-panel p-8 rounded-3xl border border-amber-500/40 shadow-xl shadow-amber-500/10 text-center flex flex-col items-center space-y-5">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-3xl">
          👑
        </div>

        <div class="space-y-2">
          <div class="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-300 text-xs px-3 py-1 rounded-full border border-amber-500/40 font-bold uppercase">
            Seu Nível Atual: ${member ? member.tier_name : 'Nível Inicial'}
          </div>
          <h2 class="font-heading font-black text-2xl sm:text-3xl text-white">Upgrade Necessário para Nível 3</h2>
          <p class="text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed">
            Muito obrigado por apoiar o canal! A liberação das chaves do <strong class="text-white">DLuzMobilador Pro</strong> e do <strong class="text-[#00f0ff]">Emulador Orbix Linux</strong> é exclusiva para membros a partir do <strong class="text-[#ffd700]">Nível 3 (Ouro / Elite)</strong>.
          </p>
        </div>

        <!-- Botão Direto de Upgrade no YouTube -->
        <a 
          href="https://www.youtube.com/channel/UCowvrE3cNyiHcsMQRcQlp-w/join" 
          target="_blank"
          class="inline-flex items-center space-x-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition"
        >
          <span>Fazer Upgrade para Nível 3 no YouTube</span>
          <span>⚡</span>
        </a>

        <p class="text-xs text-slate-500">
          Após alterar o nível no YouTube, basta recarregar esta página para sua chave ser liberada automaticamente!
        </p>
      </div>

    </div>
  `;
}

// Tela 4: Não é Membro do Canal
function renderNotMemberView(container) {
  container.innerHTML = `
    <div class="w-full max-w-2xl flex flex-col space-y-6">
      
      <div class="glass-panel p-8 rounded-3xl border border-rose-500/40 shadow-xl shadow-rose-500/10 text-center flex flex-col items-center space-y-5">
        <div class="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center text-3xl">
          🔒
        </div>

        <div class="space-y-2">
          <div class="inline-flex items-center space-x-2 bg-rose-500/20 text-rose-300 text-xs px-3 py-1 rounded-full border border-rose-500/40 font-bold uppercase">
            Assinatura Não Encontrada
          </div>
          <h2 class="font-heading font-black text-2xl sm:text-3xl text-white">Você Ainda Não é Membro do Canal</h2>
          <p class="text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed">
            Não localizamos uma assinatura ativa de membro vinculada à conta do YouTube conectada (<strong class="text-white">${appState.user.displayName}</strong>).
          </p>
        </div>

        <a 
          href="https://www.youtube.com/channel/UCowvrE3cNyiHcsMQRcQlp-w/join" 
          target="_blank"
          class="inline-flex items-center space-x-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition"
        >
          <span>Tornar-se Membro no YouTube (Nível 3)</span>
          <span>👑</span>
        </a>

        <p class="text-xs text-slate-500">
          Já virou membro? Aguarde 1 a 2 minutos para sincronização do Google e recarregue a página.
        </p>
      </div>

    </div>
  `;
}

// Ação: Resgatar Chave
async function handleClaimKey() {
  const btn = document.getElementById('btn-claim-key');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin mr-2">⚙️</span> Gerando Chave Oficial...`;
  }

  try {
    const res = await fetch('/api/member/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao resgatar chave.');
    }

    appState.license = { key: data.key };
    showToast(data.message || 'Chave oficial gerada com sucesso!', 'success');
    
    // Atualiza a área da chave
    const keyArea = document.getElementById('key-display-area');
    if (keyArea) {
      keyArea.innerHTML = renderKeyDisplayHtml(data.key);
    }
  } catch (error) {
    showToast(error.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>🔑 Tentar Novamente</span>`;
    }
  }
}

// Ação: Copiar Chave
function copyKey(key) {
  navigator.clipboard.writeText(key).then(() => {
    showToast('Chave copiada com sucesso!', 'success');
    const btn = document.getElementById('btn-copy-key');
    if (btn) {
      btn.innerHTML = `<span>✅ Copiado!</span>`;
      setTimeout(() => {
        btn.innerHTML = `<span>📋 Copiar Chave</span>`;
      }, 2000);
    }
  });
}

// Ação: Copiar Comando Linux
function copyCommand(cmd) {
  navigator.clipboard.writeText(cmd).then(() => {
    showToast('Comando de instalação copiado!', 'success');
    const btn = document.getElementById('btn-copy-command');
    if (btn) {
      btn.innerHTML = `<span>✅ Comando Copiado!</span>`;
      setTimeout(() => {
        btn.innerHTML = `<span>📋 Copiar Comando do Terminal</span>`;
      }, 2000);
    }
  });
}

// Ação: Enviar para WhatsApp
async function handleSendWhatsApp(e) {
  e.preventDefault();
  const phoneInput = document.getElementById('whatsapp-phone');
  const btn = document.getElementById('btn-send-whatsapp');
  const phone = phoneInput.value.trim();

  if (!phone) return;

  btn.disabled = true;
  btn.innerHTML = `<span>Enviando...</span>`;

  try {
    const res = await fetch('/api/member/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao enviar mensagem.');
    }

    showToast(data.message || 'Chave e links enviados no WhatsApp com sucesso!', 'success');
    phoneInput.value = '';
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Enviar no Zap</span><span>📲</span>`;
  }
}

// Função de Simulação de Login (Para Teste)
function simulateAuth(scenario) {
  window.location.href = `/auth/demo?scenario=${scenario}`;
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);
