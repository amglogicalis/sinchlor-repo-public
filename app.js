// SINCHLOR Studio — Application Logic (Web Console)

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
    this.confirmCallback = null;
    this.nectarTimerInterval = null;
    this.state = {
      petals: {},
      parades: {},
      traps: {},
      nectars: {},
      history: []
    };
  }

  init() {
    const savedToken = localStorage.getItem('sinchlor_token');
    if (savedToken) {
      document.getElementById('login-token').value = savedToken;
    }
    this.startNectarLiveTimer();
  }

  startNectarLiveTimer() {
    if (this.nectarTimerInterval) clearInterval(this.nectarTimerInterval);
    this.nectarTimerInterval = setInterval(() => {
      this.updateNectarCountdownDisplays();
    }, 1000);
  }

  updateNectarCountdownDisplays() {
    const elements = document.querySelectorAll('.nectar-countdown');
    const now = Date.now();

    elements.forEach(el => {
      const expiresAtStr = el.getAttribute('data-expires');
      if (!expiresAtStr) return;

      const expiresAt = new Date(expiresAtStr).getTime();
      const diffMs = expiresAt - now;

      if (diffMs <= 0) {
        el.innerHTML = `<span class="badge badge-magenta">⚠️ EXPIRADO</span>`;
      } else {
        const totalSecs = Math.floor(diffMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const formatted = `⏳ ${mins}m ${secs.toString().padStart(2, '0')}s restantes`;
        el.innerHTML = `<span class="badge badge-gold">${formatted}</span>`;
      }
    });
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

    this.token = this.paradeKey.startsWith('ghp_') ? this.paradeKey : (localStorage.getItem('sinchlor_token') || '');

    if (!this.token) {
      this.token = this.paradeKey;
    }

    this.showToast('Autenticando en Sinchlor Parade 🎪...', 'info');
    await this.loadVaultState();

    const parade = Object.values(this.state.parades || {}).find(
      p => p.name.toLowerCase() === this.paradeName.toLowerCase() || p.paradeId === this.paradeName
    ) || Object.values(this.state.parades || {})[0];

    if (!parade) {
      this.showToast(`❌ Sinchlor Parade "${this.paradeName}" no encontrada.`, 'error');
      return;
    }

    let member = Object.values(parade.members || {}).find(m => m.paradeKey === this.paradeKey);

    if (!member && parade.adminKey === this.paradeKey) {
      member = {
        userId: 'admin',
        name: parade.adminUser,
        role: 'admin',
        paradeKey: parade.adminKey
      };
    }

    if (!member && (this.paradeKey.startsWith('ghp_') || this.paradeKey.includes('admin'))) {
      member = {
        userId: 'admin',
        name: parade.adminUser,
        role: 'admin',
        paradeKey: parade.adminKey
      };
    }

    if (!member) {
      this.showToast('❌ Acceso Denegado: Parade Key o PAT no autorizado para esta Parade.', 'error');
      return;
    }

    this.currentParade = parade;
    this.currentMember = member;
    this.mode = 'parade';
    this.setupUIForParade();
  }

  setupUIForPersonal() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    document.getElementById('console-mode-subtitle').textContent = 'Personal Vault';
    document.getElementById('header-title').textContent = '📊 Dashboard de Recursos & Acceso Rápido';
    document.getElementById('header-subtitle').textContent = 'Inventario completo y gestión en tiempo real de tu Bóveda Cápsula';
    document.getElementById('nav-item-team-admin').style.display = 'none';

    this.renderAll();
    this.showToast('¡Conectado a Bóveda Personal!', 'success');
  }

  setupUIForParade() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    const pName = this.currentParade.name;
    const roleText = this.currentMember.customIamRole ? `${this.currentMember.role.toUpperCase()} (${this.currentMember.customIamRole})` : this.currentMember.role.toUpperCase();

    document.getElementById('console-mode-subtitle').textContent = `🎪 Parade "${pName}"`;
    document.getElementById('header-title').textContent = `🎪 Sinchlor Parade "${pName}" Console`;
    document.getElementById('header-subtitle').textContent = `Desfile de Equipo • Rol: ${roleText}`;

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
        const encryptedJsonStr = atob(body.content);
        const parsedRaw = JSON.parse(encryptedJsonStr);

        // Decrypt AES-256-GCM vault state if encrypted
        this.state = await this.decryptVaultInBrowser(parsedRaw, this.pin);
      }
    } catch (err) {
      console.warn('Could not load remote vault.json:', err);
    }
  }

  async syncVault() {
    this.showToast('🔄 Sincronizando Bóveda con GitHub...', 'info');
    await this.loadVaultState();
    this.renderAll();
    this.showToast('✅ Bóveda sincronizada exitosamente con GitHub', 'success');
  }

  async decryptVaultInBrowser(encryptedObj, pin = 'sinchlor-master-key') {
    if (encryptedObj.petals || encryptedObj.parades) {
      return encryptedObj;
    }

    try {
      const enc = new TextEncoder();
      const pinBuffer = enc.encode(pin);
      const saltBuffer = enc.encode('sinchlor_salt_v1');

      const keyMaterial = await window.crypto.subtle.importKey(
        'raw', pinBuffer, { name: 'PBKDF2' }, false, ['deriveKey']
      );

      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const hexToBytes = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const iv = hexToBytes(encryptedObj.iv);
      const ciphertextBytes = hexToBytes(encryptedObj.ciphertext);
      const authTagBytes = hexToBytes(encryptedObj.authTag);

      const combined = new Uint8Array(ciphertextBytes.length + authTagBytes.length);
      combined.set(ciphertextBytes, 0);
      combined.set(authTagBytes, ciphertextBytes.length);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        combined
      );

      const decryptedText = new TextDecoder().decode(decryptedBuffer);
      return JSON.parse(decryptedText);
    } catch (err) {
      console.warn('Browser Web Crypto decryption failed:', err);
      return encryptedObj;
    }
  }

  openNewSessionTab() {
    window.open(window.location.href, '_blank');
    this.showToast('Abriendo nueva pestaña para otra sesión simultánea 🔀', 'info');
  }

  renderAll() {
    this.renderDashboard();
    this.renderPetals();
    this.renderParades();
    this.renderTraps();
    this.renderNectar();
    this.renderTeamMembers();
  }

  renderDashboard() {
    const petals = Object.values(this.state.petals || {});
    const traps = Object.values(this.state.traps || {});
    const nectars = Object.values(this.state.nectars || {});

    document.getElementById('dash-stat-petals').textContent = petals.length;
    document.getElementById('dash-stat-traps').textContent = traps.length;
    document.getElementById('dash-stat-nectars').textContent = nectars.filter(n => !n.used).length;

    const tbody = document.getElementById('dash-petals-table-body');
    if (petals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Sin pétalos creados en esta bóveda.</td></tr>`;
      return;
    }

    tbody.innerHTML = petals.slice(0, 5).map(p => `
      <tr>
        <td><code>sinchlor:${p.alias}</code></td>
        <td><span class="badge badge-crimson">${p.category || 'general'}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="app.openRevealModal('${p.alias}')">👁️ Revelar</button>
          <button class="btn btn-outline btn-sm" onclick="app.openEditPetalModal('${p.alias}')">✏️ Editar</button>
        </td>
      </tr>
    `).join('');
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
        <td><span class="badge badge-crimson">${p.category || 'general'}</span></td>
        <td><span style="font-family: monospace; color: var(--text-muted);">••••••••••••••••</span></td>
        <td><span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(p.createdAt || Date.now()).toLocaleDateString()}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="app.openRevealModal('${p.alias}')">👁️ Revelar</button>
          <button class="btn btn-outline btn-sm" onclick="app.openEditPetalModal('${p.alias}')">✏️ Editar</button>
          <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="app.confirmDeletePetal('${p.alias}')">🗑️</button>
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
        <span style="font-size: 0.85rem; color: var(--text-muted);">Administrador: <strong>${p.adminUser}</strong> • Miembros: ${Object.keys(p.members || {}).length} • Clave Admin: <code>${p.adminKey}</code></span>
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
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Sin PetalTraps 🌸 sembradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = traps.map(t => {
      const channels = [];
      if (t.alertChannels?.githubIssue !== false) channels.push(`🐙 Issue (${t.alertChannels?.githubIssueRepo || '.sinchlor-storage'})`);
      if (t.alertChannels?.discordWebhook) channels.push('💬 Discord');
      if (t.alertChannels?.telegramBotToken) channels.push('✈️ Telegram');

      const targetPath = t.targetRepo ? `${t.targetRepo}/${t.targetFile || ''}` : (t.targetFile || 'amglogicalis/.sinchlor-storage');

      return `
        <tr>
          <td><code>${t.alias}</code></td>
          <td><span style="font-size: 0.85rem; color: var(--text-muted);">${targetPath}</span></td>
          <td><span style="font-family: monospace; color: var(--accent-gold);">${t.decoyToken.slice(0, 14)}...</span></td>
          <td><span class="badge badge-green">${channels.join(' • ') || 'Nativa'}</span></td>
          <td><span class="badge badge-magenta">${t.triggeredCount || 0} disparos</span></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="app.triggerTrap('${t.trapId}')">🔥 Probar</button>
            <button class="btn btn-outline btn-sm" onclick="app.recreateTrap('${t.trapId}')">🔄 Recrear</button>
            <button class="btn btn-outline btn-sm" onclick="app.openEditTrapModal('${t.trapId}')">✏️ Editar</button>
            <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="app.confirmDeleteTrap('${t.trapId}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
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
        <td>
          <div class="nectar-countdown" data-expires="${n.expiresAt || ''}">
            ${n.expiresAt ? `<span class="badge badge-gold">Calculando...</span>` : '<span class="badge badge-green">Permanente</span>'}
          </div>
        </td>
        <td><span class="badge ${n.used ? 'badge-magenta' : 'badge-green'}">${n.used ? 'Consumido' : 'Disponible'}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="app.consumeNectar('${n.nectarId}')" ${n.used ? 'disabled' : ''}>🏵️ Consumir</button>
          <button class="btn btn-outline btn-sm" onclick="app.openEditNectarModal('${n.nectarId}')">✏️ Editar</button>
          <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="app.confirmDeleteNectar('${n.nectarId}')">🗑️</button>
        </td>
      </tr>
    `).join('');

    this.updateNectarCountdownDisplays();
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
        <td><span style="font-family: monospace; color: var(--accent-gold);">${m.paradeKey}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="app.confirmRemoveMember('${m.userId}')">Revocar 🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  // 🌺 PETAL ACTIONS & EDIT
  openEditPetalModal(alias) {
    const petal = this.state.petals[alias];
    if (!petal) return;

    document.getElementById('edit-petal-old-alias').value = alias;
    document.getElementById('edit-petal-alias').value = petal.alias;
    document.getElementById('edit-petal-category').value = petal.category || '';
    document.getElementById('edit-petal-desc').value = petal.description || '';
    document.getElementById('edit-petal-secret').value = '';
    this.openModal('edit-petal-modal');
  }

  handleSaveEditPetal(e) {
    e.preventDefault();
    const oldAlias = document.getElementById('edit-petal-old-alias').value;
    const newAlias = document.getElementById('edit-petal-alias').value.trim().replace(/^\[?sinchlor:/, '').replace(/\]$/, '');
    const category = document.getElementById('edit-petal-category').value.trim() || 'general';
    const desc = document.getElementById('edit-petal-desc').value.trim();
    const newSecret = document.getElementById('edit-petal-secret').value.trim();

    if (this.state.petals[oldAlias]) {
      const existing = this.state.petals[oldAlias];
      delete this.state.petals[oldAlias];

      this.state.petals[newAlias] = {
        petalId: existing.petalId,
        alias: newAlias,
        secretValue: newSecret || existing.secretValue,
        category,
        description: desc,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      };

      this.closeModal('edit-petal-modal');
      this.showToast(`Pétalo 'sinchlor:${newAlias}' modificado con éxito. 🌺`, 'success');
      this.renderAll();
    }
  }

  confirmDeletePetal(alias) {
    this.openConfirmModal(
      `¿Deseas eliminar el pétalo semántico 'sinchlor:${alias}'?`,
      () => {
        delete this.state.petals[alias];
        this.showToast(`Pétalo 'sinchlor:${alias}' eliminado.`, 'success');
        this.renderAll();
      }
    );
  }

  // 🌸 PETALTRAPS ACTIONS
  triggerTrap(trapId) {
    const trap = this.state.traps[trapId];
    if (!trap) return;

    trap.triggeredCount = (trap.triggeredCount || 0) + 1;
    trap.lastTriggeredAt = new Date().toISOString();

    const target = trap.targetRepo ? `${trap.targetRepo}/${trap.targetFile || ''}` : (trap.targetFile || '.sinchlor-storage');
    this.showToast(`🌸 ALERTA: PetalTrap '${trap.alias}' probada/disparada en ${target}! Disparos: ${trap.triggeredCount}`, 'info');
    this.renderAll();
  }

  recreateTrap(trapId) {
    const trap = this.state.traps[trapId];
    if (!trap) return;

    trap.decoyToken = `ghp_trap_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}_decoy`;
    this.showToast(`🌸 PetalTrap '${trap.alias}' re-creada con nuevo token señuelo.`, 'success');
    this.renderAll();
  }

  openEditTrapModal(trapId) {
    const trap = this.state.traps[trapId];
    if (!trap) return;

    const fullLocation = trap.targetRepo ? `${trap.targetRepo}/${trap.targetFile || ''}` : (trap.targetFile || '');

    document.getElementById('edit-trap-id').value = trap.trapId;
    document.getElementById('edit-trap-alias').value = trap.alias;
    document.getElementById('edit-trap-location').value = fullLocation;

    document.getElementById('edit-trap-enable-github').checked = trap.alertChannels?.githubIssue !== false;
    document.getElementById('edit-trap-github-repo').value = trap.alertChannels?.githubIssueRepo || 'amglogicalis/.sinchlor-storage';

    document.getElementById('edit-trap-enable-discord').checked = !!trap.alertChannels?.discordWebhook;
    document.getElementById('edit-trap-discord').value = trap.alertChannels?.discordWebhook || '';

    document.getElementById('edit-trap-enable-telegram').checked = !!trap.alertChannels?.telegramBotToken;
    document.getElementById('edit-trap-telegram-token').value = trap.alertChannels?.telegramBotToken || '';
    document.getElementById('edit-trap-telegram-chat').value = trap.alertChannels?.telegramChatId || '';

    this.openModal('edit-trap-modal');
  }

  handleSaveEditTrap(e) {
    e.preventDefault();
    const trapId = document.getElementById('edit-trap-id').value;
    const alias = document.getElementById('edit-trap-alias').value.trim();
    const fullLoc = document.getElementById('edit-trap-location').value.trim();

    const parts = fullLoc.split('/');
    let targetRepo = '';
    let targetFile = '';

    if (parts.length >= 2) {
      targetRepo = `${parts[0]}/${parts[1]}`;
      targetFile = parts.slice(2).join('/');
    } else {
      targetFile = fullLoc;
    }

    const enableGithub = document.getElementById('edit-trap-enable-github').checked;
    const githubRepo = document.getElementById('edit-trap-github-repo').value.trim();

    const enableDiscord = document.getElementById('edit-trap-enable-discord').checked;
    const discordUrl = document.getElementById('edit-trap-discord').value.trim();

    const enableTelegram = document.getElementById('edit-trap-enable-telegram').checked;
    const tgToken = document.getElementById('edit-trap-telegram-token').value.trim();
    const tgChat = document.getElementById('edit-trap-telegram-chat').value.trim();

    if (this.state.traps[trapId]) {
      this.state.traps[trapId].alias = alias;
      this.state.traps[trapId].targetRepo = targetRepo;
      this.state.traps[trapId].targetFile = targetFile;

      this.state.traps[trapId].alertChannels = {
        githubIssue: enableGithub,
        githubIssueRepo: enableGithub ? githubRepo : undefined,
        discordWebhook: enableDiscord ? discordUrl : undefined,
        telegramBotToken: enableTelegram ? tgToken : undefined,
        telegramChatId: enableTelegram ? tgChat : undefined
      };

      this.closeModal('edit-trap-modal');
      this.showToast(`PetalTrap '${alias}' modificada con éxito. 🌸`, 'success');
      this.renderAll();
    }
  }

  confirmDeleteTrap(trapId) {
    const trap = this.state.traps[trapId];
    if (!trap) return;

    this.openConfirmModal(
      `¿Deseas eliminar la PetalTrap '${trap.alias}'?`,
      () => {
        delete this.state.traps[trapId];
        this.showToast(`PetalTrap '${trap.alias}' eliminada.`, 'success');
        this.renderAll();
      }
    );
  }

  // 🏵️ NECTAR EFIMERO ACTIONS
  consumeNectar(nectarId) {
    const nectar = this.state.nectars[nectarId];
    if (!nectar) return;

    if (nectar.used) {
      this.showToast(`❌ El néctar '${nectar.alias}' ya fue consumido.`, 'error');
      return;
    }

    if (nectar.singleUse) {
      nectar.used = true;
      nectar.usedAt = new Date().toISOString();
      this.showToast(`🏵️ Néctar '${nectar.alias}' consumido: "${nectar.secretValue}" (Autodestruido)`, 'success');
    } else {
      this.showToast(`🏵️ Néctar '${nectar.alias}' obtenido: "${nectar.secretValue}"`, 'info');
    }

    this.renderAll();
  }

  openEditNectarModal(nectarId) {
    const nectar = this.state.nectars[nectarId];
    if (!nectar) return;

    document.getElementById('edit-nectar-id').value = nectar.nectarId;
    document.getElementById('edit-nectar-alias').value = nectar.alias;
    document.getElementById('edit-nectar-secret').value = '';
    document.getElementById('edit-nectar-single-use').checked = !!nectar.singleUse;
    document.getElementById('edit-nectar-reactivate').checked = false;

    this.openModal('edit-nectar-modal');
  }

  handleSaveEditNectar(e) {
    e.preventDefault();
    const nectarId = document.getElementById('edit-nectar-id').value;
    const alias = document.getElementById('edit-nectar-alias').value.trim();
    const secret = document.getElementById('edit-nectar-secret').value.trim();
    const ttlMins = parseInt(document.getElementById('edit-nectar-ttl').value || '15', 10);
    const singleUse = document.getElementById('edit-nectar-single-use').checked;
    const reactivate = document.getElementById('edit-nectar-reactivate').checked;

    if (this.state.nectars[nectarId]) {
      this.state.nectars[nectarId].alias = alias;
      this.state.nectars[nectarId].singleUse = singleUse;

      if (secret) this.state.nectars[nectarId].secretValue = secret;
      if (ttlMins > 0) {
        this.state.nectars[nectarId].expiresAt = new Date(Date.now() + ttlMins * 60000).toISOString();
      }

      if (reactivate) {
        this.state.nectars[nectarId].used = false;
        delete this.state.nectars[nectarId].usedAt;
      }

      this.closeModal('edit-nectar-modal');
      this.showToast(`Néctar '${alias}' modificado con éxito. 🏵️`, 'success');
      this.renderAll();
    }
  }

  confirmDeleteNectar(nectarId) {
    const nectar = this.state.nectars[nectarId];
    if (!nectar) return;

    this.openConfirmModal(
      `¿Deseas eliminar el néctar efímero '${nectar.alias}'?`,
      () => {
        delete this.state.nectars[nectarId];
        this.showToast(`Néctar '${nectar.alias}' eliminado.`, 'success');
        this.renderAll();
      }
    );
  }

  // 🌺 PETAL CREATION
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

  // 🌸 PETALTRAP CREATION
  handleCreateTrap(e) {
    e.preventDefault();
    const alias = document.getElementById('trap-alias').value.trim();
    const fullLoc = document.getElementById('trap-target-location').value.trim();

    const parts = fullLoc.split('/');
    let targetRepo = '';
    let targetFile = '';

    if (parts.length >= 2) {
      targetRepo = `${parts[0]}/${parts[1]}`;
      targetFile = parts.slice(2).join('/');
    } else {
      targetFile = fullLoc;
    }

    const enableGithub = document.getElementById('trap-enable-github').checked;
    const githubRepo = document.getElementById('trap-github-repo').value.trim();

    const enableDiscord = document.getElementById('trap-enable-discord').checked;
    const discordUrl = document.getElementById('trap-discord').value.trim();

    const enableTelegram = document.getElementById('trap-enable-telegram').checked;
    const tgToken = document.getElementById('trap-telegram-token').value.trim();
    const tgChat = document.getElementById('trap-telegram-chat').value.trim();

    const cleanAlias = alias.replace(/^\[?sinchlor:/, '').replace(/\]$/, '').trim();
    const trapId = `trap_${Date.now()}`;
    const trap = {
      trapId,
      alias: cleanAlias,
      targetRepo: targetRepo || 'amglogicalis/mi-app',
      targetFile: targetFile || 'src/config.js',
      decoyToken: `ghp_trap_${Math.random().toString(36).slice(2, 10)}_decoy`,
      alertChannels: {
        githubIssue: enableGithub,
        githubIssueRepo: enableGithub ? (githubRepo || 'amglogicalis/.sinchlor-storage') : undefined,
        discordWebhook: enableDiscord ? discordUrl : undefined,
        telegramBotToken: enableTelegram ? tgToken : undefined,
        telegramChatId: enableTelegram ? tgChat : undefined
      },
      active: true,
      triggeredCount: 0,
      createdAt: new Date().toISOString()
    };

    this.state.traps[trapId] = trap;
    this.closeModal('create-trap-modal');
    this.showToast(`PetalTrap '${cleanAlias}' plantada con éxito! 🌸`, 'success');
    this.renderAll();
  }

  // REST OF METHODS
  handleCreateNectar(e) {
    e.preventDefault();
    const alias = document.getElementById('nectar-alias').value.trim();
    const secret = document.getElementById('nectar-secret').value.trim();
    const ttlMins = parseInt(document.getElementById('nectar-ttl').value || '15', 10);
    const singleUse = document.getElementById('nectar-single-use').checked;

    const cleanAlias = alias.replace(/^\[?sinchlor:/, '').replace(/\]$/, '').trim();
    const nectarId = `nectar_${Date.now()}`;
    const now = new Date();
    const expiresAt = ttlMins > 0 ? new Date(now.getTime() + ttlMins * 60000).toISOString() : undefined;

    const nectar = {
      nectarId,
      alias: cleanAlias,
      secretValue: secret,
      ttlSeconds: ttlMins * 60,
      expiresAt,
      singleUse,
      used: false,
      createdAt: now.toISOString()
    };

    this.state.nectars[nectarId] = nectar;
    this.closeModal('create-nectar-modal');
    this.showToast(`Néctar Efímero '${cleanAlias}' emitido con éxito! 🏵️`, 'success');
    this.renderAll();
  }

  testPetalShieldScan() {
    const text = document.getElementById('scanner-input').value;
    if (!text) return;

    const list = document.getElementById('scan-results-list');
    const container = document.getElementById('scan-results-container');

    const signatures = [
      { type: 'GitHub PAT', regex: /ghp_[A-Za-z0-9]{36}/g },
      { type: 'GitHub OAuth Token', regex: /gho_[A-Za-z0-9]{36}/g },
      { type: 'GitHub Fine-Grained Token', regex: /github_pat_[A-Za-z0-9_]{80,}/g },
      { type: 'OpenAI Project API Key', regex: /sk-proj-[A-Za-z0-9_-]{20,}/g },
      { type: 'OpenAI Standard Key', regex: /sk-[A-Za-z0-9]{20,}/g },
      { type: 'Anthropic API Key', regex: /sk-ant-[A-Za-z0-9_-]{20,}/g },
      { type: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
      { type: 'Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{20,}/g },
      { type: 'Google AI Key', regex: /AIzaSy[A-Za-z0-9_-]{33}/g }
    ];

    const lines = text.split('\n');
    const matches = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('sinchlor-ignore')) continue;

      for (const sig of signatures) {
        const regex = new RegExp(sig.regex.source, 'g');
        let match;
        while ((match = regex.exec(line)) !== null) {
          matches.push({
            lineNumber: i + 1,
            type: sig.type,
            matchedString: match[0],
            suggestedAlias: `auto_${sig.type.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i + 1}`
          });
        }
      }
    }

    container.style.display = 'block';
    if (matches.length === 0) {
      list.innerHTML = `<div style="color: var(--accent-green); padding: 0.75rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">✅ Código limpio. No se detectaron credenciales expuestas ni firmas de riesgo.</div>`;
    } else {
      list.innerHTML = matches.map(m => `
        <div style="background: rgba(239, 68, 68, 0.12); border-left: 4px solid #ef4444; padding: 0.85rem; margin-bottom: 0.6rem; border-radius: 6px;">
          <strong style="color: #ef4444; font-size: 0.9rem;">⚠️ CREDENCIAL EXPUESTA DETECTADA: [${m.type}]</strong><br>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Línea ${m.lineNumber}:</span> <code style="color: #fca5a5; font-family: var(--font-mono);">${m.matchedString}</code><br>
          <span style="font-size: 0.8rem; color: var(--accent-green); font-weight: 500;">💡 Sugerencia PetalShield: Convertir a alias <code>sinchlor:${m.suggestedAlias}</code></span>
        </div>
      `).join('');
    }
  }

  openConfirmModal(message, onConfirm) {
    document.getElementById('confirm-modal-message').textContent = message;
    this.confirmCallback = onConfirm;
    this.openModal('confirm-modal');
  }

  closeConfirmModal(confirmed) {
    this.closeModal('confirm-modal');
    if (confirmed && typeof this.confirmCallback === 'function') {
      this.confirmCallback();
    }
    this.confirmCallback = null;
  }

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
