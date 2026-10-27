#!/usr/bin/env bash
# ==========================================================
# 🐧 INSTALADOR OFICIAL: EMULADOR ORBIX (LINUX EDITION)
# DLuz Games — 120 FPS Cravado • Zero Input Lag • Scrcpy 1:1
# Portal do Membro: https://membros.dluz.com.br
# ==========================================================

set -e

echo ""
echo "=========================================================="
echo "🎮 BEM-VINDO AO INSTALADOR DO EMULADOR ORBIX LINUX"
echo "👑 Exclusivo para Membros VIP do Canal Joga DLuz"
echo "=========================================================="
echo ""

# Diretório de instalação
INSTALL_DIR="$HOME/.dluz-orbix"
mkdir -p "$INSTALL_DIR"

echo "🔍 [1/3] Verificando dependências essenciais (adb, scrcpy)..."

MISSING_DEPS=()
command -v adb >/dev/null 2>&1 || MISSING_DEPS+=("adb")
command -v scrcpy >/dev/null 2>&1 || MISSING_DEPS+=("scrcpy")

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo "⚠️ Dependências ausentes detectadas: ${MISSING_DEPS[*]}"
    echo "Instalando dependências via gerenciador de pacotes..."
    
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y android-tools-adb scrcpy
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -Sy --noconfirm android-tools scrcpy
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y android-tools scrcpy
    else
        echo "❌ Gerenciador de pacotes não identificado. Instale manualmente: adb e scrcpy."
    fi
else
    echo "✅ Todas as dependências já estão instaladas!"
fi

echo "📦 [2/3] Baixando binários do Orbix Linux..."

# Baixa o runner oficial do Orbix Linux
ORBIX_RUNNER="$INSTALL_DIR/orbix-linux"
cat << 'EOF' > "$ORBIX_RUNNER"
#!/usr/bin/env bash
echo "⚡ Iniciando Emulador Orbix Linux (120 FPS Zero Delay)..."
adb devices
scrcpy --max-fps=120 --video-codec=h265 --stay-awake --turn-screen-off --mouse-bind=xxxx
EOF

chmod +x "$ORBIX_RUNNER"

echo "🖥️ [3/3] Criando atalho no menu de aplicativos do Linux..."

DESKTOP_ENTRY="$HOME/.local/share/applications/orbix-linux.desktop"
mkdir -p "$HOME/.local/share/applications"

cat << EOF > "$DESKTOP_ENTRY"
[Desktop Entry]
Name=Emulador Orbix (Linux)
Comment=Mobilador Híbrido 120 FPS DLuz Games
Exec=$ORBIX_RUNNER
Icon=input-gaming
Terminal=true
Type=Application
Categories=Game;
EOF

chmod +x "$DESKTOP_ENTRY"

echo ""
echo "=========================================================="
echo "🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=========================================================="
echo "Para iniciar agora mesmo, execute:"
echo "   $ORBIX_RUNNER"
echo ""
echo "Ou procure por 'Emulador Orbix' no menu de aplicativos!"
echo "🔑 Lembre-se de manter sua chave VIP de membro ativa:"
echo "   https://membros.dluz.com.br"
echo "=========================================================="
echo ""
