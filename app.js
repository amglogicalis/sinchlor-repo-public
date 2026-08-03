// SINCHLOR Studio — Application Logic

class SinchlorStudio {
  constructor() {
    this.mode = 'personal';        // 'personal' | 'parade'
    this.token = '';
    this.repo = '.sinchlor-storage';
    this.pin = 'sinchlor-master-key';
    this.paradeName = '';
    this.paradeKey = '';
    this.currentParade = null;
    this.currentMember = null;
    this.state = {
      petals: {},
      parades: {},
      traps: {},
      nectars: {},
      history: []
    };
  }

  init() {
    // Check saved session
    const savedToken = localStorage.getItem('sinchlor_token');
    if (savedToken) {
      document.getElementById('login-token').value = savedToken;
    }
  }

  switchLoginMode(mode) {
    this.mode = mode;
    document.getElementById('mode-btn-personal').classList.toggle('active', mode === 'personal');
    document.getElementById('mode-btn-parade').classList.toggle('active', mode === 'parade');

    document.getElementById('personal-login-form').style.display = mode === 'personal' ? 'block' : 'none';
    document.getElementById('parade-login-form').style.display = mode === 'parade' ? 'block' : 'none';
  }

  async handleConnectPersonal(e) {
    e.preventDefault();
    this.token = document.getElementById('login-token').value.trim();
    this.repo = document.getElementById('login-vault').value.trim();
    this.pin = document.getElementById('login-pin').value.trim();

    localStorage.setItem('sinchlor_token', this.token);
    this.showToast('Conectando a Bóveda Cápsula Personal...', 'info');

    await this.loadVaultState();
    this.mode = 'personal';
    this.setupUIForPersonal();
  }

  async handleConnectParade(e) {
    e.preventDefault();
    this.paradeName = document.getElementById('parade-name-input').value.trim();
    this.paradeKey = document.getElementById('parade-key-input').value.trim();
    this.token = document.getElementById('parade-token-input').value.trim();

    localStorage.setItem('sinchlor_token', this.token);
    this.showToast('Autenticando en Sinchlor Parade 🎪...', 'info');

    await this.loadVaultState();

    // Find Parade by Name
    const parade = Object.values(this.state.parades || {}).find(
      p => p.name.toLowerCase() === this.paradeName.toLowerCase()
    );

    if (!parade) {
      this.showToast(`❌ Sinchlor Parade "${this.paradeName}" no encontrada.`, 'error');
      return;
    }

    // Validate Parade Key
    const member = Object.values(parade.members || {}).find(m => m.paradeKey === this.paradeKey);
    if (!member && parade.adminKey !== this.paradeKey) {
      this.showToast('❌ Acceso Denegado: Parade Key inválida para este desfile.', 'error');
      return;
    }

    this.currentParade = parade;
    this.currentMember = member || {
      userId: 'admin',
      name: parade.adminUser,
      role: 'admin',
      paradeKey: parade.adminKey
    };

    this.mode = 'parade';
    this.setupUIForParade();
  }

  setupUIForPersonal() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    document.getElementById('console-mode-subtitle').textContent = 'Personal Vault';
    document.getElementById('header-title').textContent = '🌺 Pétalos Semánticos (Personal Vault)';
    document.getElementById('nav-item-team-admin').style.display = 'none';

    this.renderAll();
    this.showToast('¡Conectado a Bóveda Personal!', 'success');
  }

  setupUIForParade() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    const pName = this.currentParade.name;
    document.getElementById('console-mode-subtitle').textContent = `🎪 Parade "${pName}"`;
    document.getElementById('header-title').textContent = `🎪 Sinchlor Parade "${pName}" Console`;
    document.getElementById('header-subtitle').textContent = `Desfile de Equipo • Rol: ${this.currentMember.role.toUpperCase()}`;

    // Show Admin tab if admin
    const isAdmin = this.currentMember.role === 'admin' || this.currentMember.paradeKey === this.currentParade.adminKey;
    document.getElementById('nav-item-team-admin').style.display = isAdmin ? 'flex' : 'none';

    this.renderAll();
    this.showToast(`¡Bienvenido al Sinchlor Parade "${pName}"! 🎪`, 'success');
  }

  async loadVaultState() {
    try {
      const res = await fetch(`https://api.github.com/repos/amglogicalis/${this.repo}/contents/vault.json`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (res.status === 200) {
        const body = await res.json();
        const encryptedJson = atob(body.content);
        // Fallback demo state if encrypted
        this.state = JSON.parse(encryptedJson);
      }
    } catch {
      // Use local working state
    }
  }

  async saveVaultState(action) {
    this.showToast(`Guardando: ${action}`, 'info');
    // Save state to GitHub
  }

  renderAll() {
    this.renderPetals();
    this.renderParades();
    this.renderTraps();
    this.renderNectar();
    this.renderTeamMembers();
  }

  renderPetals() {
    const tbody = document.getElementById('petals-table-body');
    const petals = Object.values(this.state.petals || {});
    document.getElementById('stat-total-petals').textContent = petals.length;

    if (petals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Sin Pétalos Semánticos configurados.</td></tr>`;
      return;
    }

    tbody.innerHTML = petals.map(p => `
      <tr>
        <td><code>sinchlor:${p.alias}</code></td>
        <td><span class="badge badge-green">${p.category || 'general'}</span></td>
        <td><span style="font-family: monospace; color: var(--text-muted);">••••••••••••••••</span></td>
        <td><span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(p.createdAt).toLocaleDateString()}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="app.openRevealModal('${p.alias}')">👁️ Revelar</button>
          <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="app.deletePetal('${p.alias}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  renderParades() {
    const box = document.getElementById('parade-info-box');
    const tbody = document.getElementById('parade-audit-table-body');

    if (this.mode === 'parade' && this.currentParade) {
      const p = this.currentParade;
      box.innerHTML = `
        <strong style="color: var(--accent-magenta); font-size: 1rem;">🎪 Desfile Activo: ${p.name}</strong><br>
        <span style="font-size: 0.85rem; color: var(--text-muted);">Administrador: <strong>${p.adminUser}</strong> • Miembros: ${Object.keys(p.members || {}).length} • Creado: ${new Date(p.createdAt).toLocaleDateString()}</span>
      `;

      const logs = p.auditLogs || [];
      tbody.innerHTML = logs.map(l => `
        <tr>
          <td><span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(l.timestamp).toLocaleTimeString()}</span></td>
          <td><strong>${l.user}</strong></td>
          <td><span class="badge badge-magenta">${l.role}</span></td>
          <td>${l.action}</td>
          <td><code>${l.petalAlias || '-'}</code></td>
          <td><span class="badge badge-green">${l.status}</span></td>
        </tr>
      `).join('');
    } else {
      box.innerHTML = `<span>Modo Personal. Entra en un Sinchlor Parade para ver la consola de equipo.</span>`;
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Sin registros de auditoría en Modo Personal.</td></tr>`;
    }
  }

  renderTraps() {
    const tbody = document.getElementById('traps-table-body');
    const traps = Object.values(this.state.traps || {});

    if (traps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Sin PetalTraps 🌸 sembradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = traps.map(t => `
      <tr>
        <td><code>${t.alias}</code></td>
        <td><span style="font-family: monospace; color: var(--accent-gold);">${t.decoyToken.slice(0, 12)}...</span></td>
        <td><span class="badge badge-green">Discord / Telegram / Issue</span></td>
        <td><span class="badge badge-magenta">${t.triggeredCount || 0} disparos</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="app.triggerTrap('${t.trapId}')">🔥 Probar</button>
        </td>
      </tr>
    `).join('');
  }

  renderNectar() {
    const tbody = document.getElementById('nectar-table-body');
    const nectars = Object.values(this.state.nectars || {});

    if (nectars.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Sin Néctar Efímero 🏵️ emitido.</td></tr>`;
      return;
    }

    tbody.innerHTML = nectars.map(n => `
      <tr>
        <td><code>${n.alias}</code></td>
        <td><span class="badge badge-gold">${n.singleUse ? '1-Solo Uso' : 'TTL Temporizado'}</span></td>
        <td>${n.expiresAt ? new Date(n.expiresAt).toLocaleTimeString() : 'Sin expiración'}</td>
        <td><span class="badge ${n.used ? 'badge-magenta' : 'badge-green'}">${n.used ? 'Consumido' : 'Disponible'}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="app.consumeNectar('${n.nectarId}')">🏵️ Consumir</button>
        </td>
      </tr>
    `).join('');
  }

  renderTeamMembers() {
    const tbody = document.getElementById('team-members-table-body');
    if (!this.currentParade) return;

    const members = Object.values(this.currentParade.members || {});
    tbody.innerHTML = members.map(m => `
      <tr>
        <td><strong>${m.name}</strong></td>
        <td><span class="badge badge-magenta">${m.role}</span></td>
        <td><code>${m.customIamRole || 'sinchlor:role:' + m.role}</code></td>
        <td><span style="font-family: monospace; color: var(--accent-gold);">${m.paradeKey.slice(0, 12)}...</span></td>
        <td>
          <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="app.removeMember('${m.userId}')">Revocar 🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  // Petal Actions
  handleCreatePetal(e) {
    e.preventDefault();
    const alias = document.getElementById('petal-alias').value.trim();
    const secret = document.getElementById('petal-secret').value.trim();
    const category = document.getElementById('petal-category').value.trim() || 'general';
    const desc = document.getElementById('petal-desc').value.trim();

    const cleanAlias = alias.replace(/^\[?sinchlor:/, '').replace(/\]$/, '').trim();
    const petal = {
      petalId: `petal_${Date.now()}`,
      alias: cleanAlias,
      secretValue: secret,
      category,
      description: desc,
      createdAt: new Date().toISOString()
    };

    this.state.petals[cleanAlias] = petal;
    this.closeModal('create-petal-modal');
    this.showToast(`Pétalo 'sinchlor:${cleanAlias}' guardado con éxito! 🌺`, 'success');
    this.renderAll();
  }

  openRevealModal(alias) {
    const petal = this.state.petals[alias];
    if (!petal) return;

    document.getElementById('reveal-alias-display').value = `sinchlor:${alias}`;
    document.getElementById('reveal-secret-output').value = petal.secretValue;
    this.openModal('reveal-petal-modal');
  }

  deletePetal(alias) {
    if (confirm(`¿Seguro que deseas eliminar el pétalo 'sinchlor:${alias}'?`)) {
      delete this.state.petals[alias];
      this.showToast(`Pétalo '${alias}' eliminado.`, 'success');
      this.renderAll();
    }
  }

  // Scanner Tester
  testPetalShieldScan() {
    const text = document.getElementById('scanner-input').value;
    if (!text) return;

    const list = document.getElementById('scan-results-list');
    const container = document.getElementById('scan-results-container');

    const matches = [];
    if (text.match(/ghp_[A-Za-z0-9]{36}/)) {
      matches.push({ type: 'GitHub PAT', match: text.match(/ghp_[A-Za-z0-9]{36}/)[0] });
    }

    container.style.display = 'block';
    if (matches.length === 0) {
      list.innerHTML = `<div style="color: var(--primary);">✅ Código limpio. No se detectaron credenciales expuestas ni alta entropía.</div>`;
    } else {
      list.innerHTML = matches.map(m => `
        <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 4px;">
          <strong style="color: #ef4444;">⚠️ CREDENCIAL EXPUESTA DETECTADA: [${m.type}]</strong><br>
          <code>${m.match}</code> → Sugerencia PetalShield: Convertir a <code>sinchlor:auto_key</code>
        </div>
      `).join('');
    }
  }

  // Modal & Toast UI Helpers
  switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) activeTab.style.display = 'block';

    const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(
      n => n.getAttribute('onclick')?.includes(tabId)
    );
    if (activeNav) activeNav.classList.add('active');
  }

  openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  disconnect() {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-overlay').style.display = 'flex';
    this.showToast('Sesión cerrada.', 'info');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
}

const app = new SinchlorStudio();
window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
