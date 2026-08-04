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
    this.vaultSha = undefined;
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

  generateRealisticDecoy(entityType) {
    const randomBase62 = (len) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let res = '';
      for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
      return res;
    };

    const randomUpperBase36 = (len) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let res = '';
      for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
      return res;
    };

    switch (entityType) {
      case 'aws':
        return `AKIA${randomUpperBase36(16)}`;
      case 'stripe':
        return `sk_live_${randomBase62(24)}`;
      case 'openai':
        return `sk-proj-${randomBase62(48)}`;
      case 'credit_card': {
        let digits = '400000';
        for (let i = 0; i < 9; i++) digits += Math.floor(Math.random() * 10).toString();
        let sum = 0, shouldDouble = true;
        for (let i = digits.length - 1; i >= 0; i--) {
          let digit = parseInt(digits.charAt(i), 10);
          if (shouldDouble) { digit *= 2; if (digit > 9) digit -= 9; }
          sum += digit;
          shouldDouble = !shouldDouble;
        }
        const checksum = (10 - (sum % 10)) % 10;
        return `${digits}${checksum}`;
      }
      case 'github':
      default:
        return `ghp_${randomBase62(36)}`;
    }
  }

  // 🛡️ FULL DECLARATIVE JSON POLICY ENGINE FOR WEB CONSOLE
  canUserExecuteAction(requiredAction) {
    if (this.mode !== 'parade') return true; // Full access in Personal Mode
    if (!this.currentMember) return false;

    const member = this.currentMember;
    const role = member.role;
    const customIamRole = member.customIamRole || '';

    // 1. Admin native role or parade creator
    if (role === 'admin' || member.paradeKey === this.currentParade?.adminKey || member.name === this.currentParade?.adminUser) {
      return true;
    }

    // 2. Native Editor Role
    if (role === 'editor') {
      const editorDenied = ['sinchlor:parade:admin', 'sinchlor:parade:read_members'];
      if (editorDenied.includes(requiredAction)) return false;
      return true;
    }

    // 3. Native Viewer Role
    if (role === 'viewer') {
      const viewerAllowed = ['sinchlor:petals:read', 'sinchlor:nectar:consume', 'sinchlor:traps:read'];
      return viewerAllowed.includes(requiredAction);
    }

    // 4. Custom IAM / Lumina / AWS Policy Declarations
    let statements = [];

    // Pre-made AWS / Lumina / Sinchlor Policies Mapping
    if (customIamRole.includes('AWSAdminView')) {
      statements = [
        { Effect: 'Allow', Action: ['sinchlor:petals:read', 'sinchlor:petals:reveal', 'sinchlor:nectar:*', 'sinchlor:parade:admin'], Resource: '*' },
        { Effect: 'Deny', Action: ['sinchlor:petals:write', 'sinchlor:traps:write'], Resource: '*' }
      ];
    } else if (customIamRole.includes('NativeNectar_Only')) {
      statements = [
        { Effect: 'Allow', Action: ['sinchlor:nectar:create', 'sinchlor:nectar:consume', 'sinchlor:petals:read'], Resource: '*' },
        { Effect: 'Deny', Action: ['sinchlor:petals:reveal', 'sinchlor:petals:write', 'sinchlor:traps:*', 'sinchlor:parade:admin'], Resource: '*' }
      ];
    } else if (customIamRole.includes('traps_auditor')) {
      statements = [
        { Effect: 'Allow', Action: ['sinchlor:traps:read', 'sinchlor:traps:write', 'sinchlor:traps:trigger', 'sinchlor:nectar:consume', 'sinchlor:petals:read'], Resource: '*' },
        { Effect: 'Deny', Action: ['sinchlor:petals:reveal', 'sinchlor:petals:write', 'sinchlor:nectar:create', 'sinchlor:parade:admin'], Resource: '*' }
      ];
    } else if (customIamRole.includes('TerraDevOps') || customIamRole.includes('DevOps')) {
      statements = [
        { Effect: 'Allow', Action: ['sinchlor:petals:read', 'sinchlor:petals:reveal', 'sinchlor:nectar:*'], Resource: '*' },
        { Effect: 'Deny', Action: ['sinchlor:petals:write', 'sinchlor:traps:write', 'sinchlor:parade:admin'], Resource: '*' }
      ];
    } else {
      // Default fallback for custom IAM
      statements = [
        { Effect: 'Allow', Action: ['sinchlor:petals:read', 'sinchlor:nectar:consume'], Resource: '*' }
      ];
    }

    return this.evaluatePolicyStatements(statements, requiredAction);
  }

  evaluatePolicyStatements(statements, requiredAction) {
    const actionMatches = (pattern, action) => {
      if (pattern === '*' || pattern === 'sinchlor:*') return true;
      const regexPattern = '^' + pattern.replace(/\*/g, '.*') + '$';
      return new RegExp(regexPattern).test(action);
    };

    // Explicit Deny takes absolute precedence
    for (const stmt of statements) {
      if (stmt.Effect === 'Deny') {
        const deniedActions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
        for (const pattern of deniedActions) {
          if (actionMatches(pattern, requiredAction)) return false;
        }
      }
    }

    // Check Allow
    for (const stmt of statements) {
      if (stmt.Effect === 'Allow') {
        const allowedActions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
        for (const pattern of allowedActions) {
          if (actionMatches(pattern, requiredAction)) return true;
        }
      }
    }

    return false;
  }

  // TOTAL RESOURCE ISOLATION: Personal Vault vs Parade Vault
  getActivePetals() {
    if (this.mode === 'parade' && this.currentParade) {
      if (!this.currentParade.petals) this.currentParade.petals = {};
      return this.currentParade.petals;
    }
    if (!this.state.petals) this.state.petals = {};
    return this.state.petals;
  }

  getActiveTraps() {
    if (this.mode === 'parade' && this.currentParade) {
      if (!this.currentParade.traps) this.currentParade.traps = {};
      return this.currentParade.traps;
    }
    if (!this.state.traps) this.state.traps = {};
    return this.state.traps;
  }

  getActiveNectars() {
    if (this.mode === 'parade' && this.currentParade) {
      if (!this.currentParade.nectars) this.currentParade.nectars = {};
      return this.currentParade.nectars;
    }
    if (!this.state.nectars) this.state.nectars = {};
    return this.state.nectars;
  }

  logParadeAction(actionDesc, status = 'success') {
    if (this.mode === 'parade' && this.currentParade) {
      if (!this.currentParade.auditLogs) this.currentParade.auditLogs = [];
      this.currentParade.auditLogs.unshift({
        logId: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        user: this.currentMember?.name || 'Usuario',
        role: this.currentMember?.customIamRole || this.currentMember?.role || 'member',
        action: actionDesc,
        status
      });
      if (this.currentParade.auditLogs.length > 100) this.currentParade.auditLogs.pop();
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
    localStorage.setItem('sinchlor_token', this.token);
    this.showToast('Conectando a Bóveda Cápsula Personal...', 'info');

    // STRICT CLEANUP OF PARADE STATE IN PERSONAL MODE
    this.mode = 'personal';
    this.currentParade = null;
    this.currentMember = null;

    await this.loadVaultState();
    this.setupUIForPersonal();
  }

  async handleConnectParade(e) {
    e.preventDefault();
    this.paradeName = document.getElementById('parade-name-input').value.trim();
    this.paradeKey = document.getElementById('parade-key-input').value.trim();

    let inputPat = '';
    let inputKey = this.paradeKey;

    if (this.paradeKey.includes(':')) {
      const parts = this.paradeKey.split(':');
      inputPat = parts[0].trim();
      inputKey = parts[1].trim();
    } else if (this.paradeKey.startsWith('ghp_')) {
      inputPat = this.paradeKey;
    }

    this.token = inputPat || localStorage.getItem('sinchlor_token') || '';

    this.showToast('Autenticando en Sinchlor Parade 🎪...', 'info');
    await this.loadVaultState();

    const parade = Object.values(this.state.parades || {}).find(
      p => p.name.toLowerCase() === this.paradeName.toLowerCase() || p.paradeId === this.paradeName
    ) || Object.values(this.state.parades || {})[0];

    if (!parade) {
      this.showToast(`❌ Sinchlor Parade "${this.paradeName}" no encontrada.`, 'error');
      return;
    }

    let member = Object.values(parade.members || {}).find(
      m => m.paradeKey === inputKey || m.userId === inputKey
    );

    if (!member && (inputKey === parade.adminKey || inputKey.startsWith('ghp_') || inputPat.startsWith('ghp_'))) {
      member = Object.values(parade.members || {}).find(m => m.role === 'admin') || {
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
    if (!this.currentParade.petals) this.currentParade.petals = {};
    if (!this.currentParade.traps) this.currentParade.traps = {};
    if (!this.currentParade.nectars) this.currentParade.nectars = {};

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
    const roleText = this.currentMember.customIamRole ? `${this.currentMember.customIamRole}` : this.currentMember.role.toUpperCase();

    document.getElementById('console-mode-subtitle').textContent = `🎪 Parade "${pName}"`;
    document.getElementById('header-title').textContent = `🎪 Sinchlor Parade "${pName}" Console`;
    document.getElementById('header-subtitle').textContent = `Desfile de Equipo • Rol: ${roleText}`;

    // STRICT TEAM MANAGEMENT ACCESSIBILITY (EVALUATES sinchlor:parade:admin)
    const canAdminTeam = this.canUserExecuteAction('sinchlor:parade:admin');
    document.getElementById('nav-item-team-admin').style.display = canAdminTeam ? 'flex' : 'none';

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
        this.vaultSha = body.sha;
        const encryptedJsonStr = atob(body.content);
        const parsedRaw = JSON.parse(encryptedJsonStr);

        this.state = await this.decryptVaultInBrowser(parsedRaw, this.pin);

        // Re-sync currentParade if active in Parade Mode
        if (this.mode === 'parade' && this.currentParade) {
          const freshParade = this.state.parades[this.currentParade.paradeId] || Object.values(this.state.parades)[0];
          if (freshParade) {
            this.currentParade = freshParade;
            if (!this.currentParade.petals) this.currentParade.petals = {};
            if (!this.currentParade.traps) this.currentParade.traps = {};
            if (!this.currentParade.nectars) this.currentParade.nectars = {};
          }
        }
      }
    } catch (err) {
      console.warn('Could not load remote vault.json:', err);
    }
  }

  async saveVaultState(actionDesc = 'Update Vault') {
    if (!this.token) return;

    this.logParadeAction(actionDesc);

    try {
      // Get current SHA first
      const getRes = await fetch(`https://api.github.com/repos/amglogicalis/${this.repo}/contents/vault.json`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (getRes.status === 200) {
        const body = await getRes.json();
        this.vaultSha = body.sha;
      }

      const jsonStr = JSON.stringify(this.state);
      const encodedContent = btoa(jsonStr);

      const putRes = await fetch(`https://api.github.com/repos/amglogicalis/${this.repo}/contents/vault.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `🛡️ Sinchlor Vault: ${actionDesc}`,
          content: encodedContent,
          sha: this.vaultSha
        })
      });

      if (putRes.status === 200 || putRes.status === 201) {
        const body = await putRes.json();
        this.vaultSha = body.content?.sha;
        this.showToast('💾 Cambios guardados remotamente en GitHub.', 'success');
      }
    } catch (err) {
      console.warn('Error saving vault state:', err);
    }
  }

  async exportPolicyToLumina(policyName, policyJson, sanctName = 'default') {
    if (!this.token) return;
    try {
      this.showToast(`🔮 Exportando política '${policyName}' a Lumina (${sanctName})...`, 'info');
      
      let sha = undefined;
      let existingLuminaState = {
        version: '1.1.0',
        activeSanct: sanctName,
        sancts: {
          [sanctName]: {
            sanctId: `sanct_${sanctName}`,
            name: sanctName,
            description: `Entorno ${sanctName}`,
            createdAt: new Date().toISOString(),
            users: {},
            policies: {},
            roles: {},
            groupMappings: {},
            activeSessions: {},
            glowwormLogs: []
          }
        },
        users: {},
        policies: {},
        roles: {}
      };

      // FETCH LUMINA.JSON DIRECTLY (Format expected by Lumina Web Console!)
      const getRes = await fetch(`https://api.github.com/repos/amglogicalis/.lumina-storage/contents/lumina.json`, {
        headers: { 'Authorization': `Bearer ${this.token}`, 'Accept': 'application/vnd.github.v3+json' }
      });

      if (getRes.status === 200) {
        const b = await getRes.json();
        sha = b.sha;
        try {
          const content = atob(b.content.replace(/\s/g, ''));
          existingLuminaState = JSON.parse(content);
        } catch {}
      }

      if (!existingLuminaState.sancts) existingLuminaState.sancts = {};
      if (!existingLuminaState.sancts[sanctName]) {
        existingLuminaState.sancts[sanctName] = {
          sanctId: `sanct_${sanctName}`,
          name: sanctName,
          description: `Entorno ${sanctName}`,
          createdAt: new Date().toISOString(),
          users: {},
          policies: {},
          roles: {},
          groupMappings: {},
          activeSessions: {},
          glowwormLogs: []
        };
      }

      const policyId = policyName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      existingLuminaState.sancts[sanctName].policies = existingLuminaState.sancts[sanctName].policies || {};
      existingLuminaState.sancts[sanctName].policies[policyId] = {
        policyId: policyId,
        name: policyName,
        description: `Exported from Sinchlor Parade for ${sanctName}`,
        statements: policyJson.Statement || [],
        provider: 'terra',
        createdAt: new Date().toISOString()
      };

      // Also sync top level
      existingLuminaState.policies = existingLuminaState.sancts[sanctName].policies;

      // Save lumina.json for Lumina Web Console
      await fetch(`https://api.github.com/repos/amglogicalis/.lumina-storage/contents/lumina.json`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🔮 Lumina Policy: Export ${policyName} (${policyId}) to lumina.json in Sanct ${sanctName}`,
          content: btoa(JSON.stringify(existingLuminaState, null, 2)),
          sha
        })
      });

      this.showToast(`✅ Política '${policyName}' exportada a lumina.json (Sanct: ${sanctName})!`, 'success');
    } catch (err) {
      console.warn('Export to Lumina error:', err);
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

  enforceRoleCapabilities() {
    if (this.mode !== 'parade' || !this.currentMember) return;

    const canWritePetals = this.canUserExecuteAction('sinchlor:petals:write');
    const canCreateNectar = this.canUserExecuteAction('sinchlor:nectar:create');
    const canWriteTraps = this.canUserExecuteAction('sinchlor:traps:write');

    // Hide create/write buttons if user's policy forbids it
    document.querySelectorAll('.btn-action-write-petals').forEach(btn => {
      btn.style.display = canWritePetals ? 'inline-block' : 'none';
    });
    document.querySelectorAll('.btn-action-create-nectar').forEach(btn => {
      btn.style.display = canCreateNectar ? 'inline-block' : 'none';
    });
    document.querySelectorAll('.btn-action-create-trap').forEach(btn => {
      btn.style.display = canWriteTraps ? 'inline-block' : 'none';
    });
  }

  renderAll() {
    this.renderDashboard();
    this.renderPetals();
    this.renderParades();
    this.renderTraps();
    this.renderNectar();
    this.renderTeamMembers();
    this.enforceRoleCapabilities();
  }

  renderDashboard() {
    const petals = Object.values(this.getActivePetals());
    const traps = Object.values(this.getActiveTraps());
    const nectars = Object.values(this.getActiveNectars());

    document.getElementById('dash-stat-petals').textContent = petals.length;
    document.getElementById('dash-stat-traps').textContent = traps.length;
    document.getElementById('dash-stat-nectars').textContent = nectars.filter(n => !n.used).length;

    const tbody = document.getElementById('dash-petals-table-body');
    if (petals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Sin pétalos creados en esta bóveda.</td></tr>`;
      return;
    }

    const canReveal = this.canUserExecuteAction('sinchlor:petals:reveal');
    const canWrite = this.canUserExecuteAction('sinchlor:petals:write');

    tbody.innerHTML = petals.slice(0, 5).map(p => `
      <tr>
        <td><code>sinchlor:${p.alias}</code></td>
        <td><span class="badge badge-crimson">${p.category || 'general'}</span></td>
        <td>
          ${canReveal ? `<button class="btn btn-outline btn-sm" onclick="app.openRevealModal('${p.alias}')">👁️ Revelar</button>` : '<span class="badge badge-magenta">🔒 Revelar Denegado</span>'}
          ${canWrite ? `<button class="btn btn-outline btn-sm" onclick="app.openEditPetalModal('${p.alias}')">✏️ Editar</button>` : ''}
        </td>
      </tr>
    `).join('');
  }

  renderPetals() {
    const tbody = document.getElementById('petals-table-body');
    const petals = Object.values(this.getActivePetals());
    document.getElementById('stat-total-petals').textContent = petals.length;

    if (petals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Sin Pétalos Semánticos configurados.</td></tr>`;
      return;
    }

    const canReveal = this.canUserExecuteAction('sinchlor:petals:reveal');
    const canWrite = this.canUserExecuteAction('sinchlor:petals:write');

    tbody.innerHTML = petals.map(p => `
      <tr>
        <td><code>sinchlor:${p.alias}</code></td>
        <td><span class="badge badge-crimson">${p.category || 'general'}</span></td>
        <td><span style="font-family: monospace; color: var(--text-muted);">••••••••••••••••</span></td>
        <td><span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(p.createdAt || Date.now()).toLocaleDateString()}</span></td>
        <td>
          ${canReveal ? `<button class="btn btn-outline btn-sm" onclick="app.openRevealModal('${p.alias}')">👁️ Revelar</button>` : '<span class="badge badge-magenta">🔒 Sin permiso de revelado</span>'}
          ${canWrite ? `
            <button class="btn btn-outline btn-sm" onclick="app.openEditPetalModal('${p.alias}')">✏️ Editar</button>
            <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="app.confirmDeletePetal('${p.alias}')">🗑️</button>
          ` : ''}
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
        <span style="font-size: 0.85rem; color: var(--text-muted);">Creador: <strong>${p.adminUser}</strong> • Miembros Registrados: ${Object.keys(p.members || {}).length} • Tu Rol: <strong style="color: var(--accent-green);">${this.currentMember?.customIamRole || this.currentMember?.role?.toUpperCase()}</strong></span>
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
    const traps = Object.values(this.getActiveTraps());

    if (traps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Sin PetalTraps 🌸 sembradas.</td></tr>`;
      return;
    }

    const canTrigger = this.canUserExecuteAction('sinchlor:traps:trigger');
    const canWriteTraps = this.canUserExecuteAction('sinchlor:traps:write');

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
            ${canTrigger ? `<button class="btn btn-outline btn-sm" onclick="app.triggerTrap('${t.trapId}')">🔥 Probar</button>` : ''}
            ${canWriteTraps ? `
              <button class="btn btn-outline btn-sm" onclick="app.recreateTrap('${t.trapId}')">🔄 Recrear</button>
              <button class="btn btn-outline btn-sm" onclick="app.openEditTrapModal('${t.trapId}')">✏️ Editar</button>
              <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="app.confirmDeleteTrap('${t.trapId}')">🗑️</button>
            ` : (!canTrigger ? '<span class="badge badge-gold">Solo Lectura</span>' : '')}
          </td>
        </tr>
      `;
    }).join('');
  }

  renderNectar() {
    const tbody = document.getElementById('nectar-table-body');
    const nectars = Object.values(this.getActiveNectars());

    if (nectars.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Sin Néctar Efímero 🏵️ emitido.</td></tr>`;
      return;
    }

    const canConsume = this.canUserExecuteAction('sinchlor:nectar:consume');
    const canCreateNectar = this.canUserExecuteAction('sinchlor:nectar:create');

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
          ${canConsume ? `<button class="btn btn-outline btn-sm" onclick="app.consumeNectar('${n.nectarId}')" ${n.used ? 'disabled' : ''}>🏵️ Consumir</button>` : ''}
          ${canCreateNectar ? `
            <button class="btn btn-outline btn-sm" onclick="app.openEditNectarModal('${n.nectarId}')">✏️ Editar</button>
            <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="app.confirmDeleteNectar('${n.nectarId}')">🗑️</button>
          ` : ''}
        </td>
      </tr>
    `).join('');

    this.updateNectarCountdownDisplays();
  }

  renderTeamMembers() {
    const tbody = document.getElementById('team-members-table-body');
    if (!this.currentParade) return;

    const members = Object.values(this.currentParade.members || {});
    tbody.innerHTML = members.map(m => {
      let badgeLabel = 'LUMINA';
      const roleLower = (m.customIamRole || '').toLowerCase();
      const isAws = m.provider === 'aws_iam' || roleLower.includes('aws') || roleLower.includes('arn:aws:');
      const isDeclarative = m.provider === 'custom_json' || roleLower.includes('sinchlor:policy:');
      const isLumina = m.provider === 'lumina_role' || roleLower.includes('lumina:');

      if (isAws) {
        badgeLabel = 'AWS IAM';
      } else if (isDeclarative) {
        badgeLabel = 'DECLARATIVE JSON';
      } else if (isLumina) {
        badgeLabel = 'LUMINA';
      } else if (m.customIamRole) {
        badgeLabel = 'CUSTOM IAM';
      }

      const roleBadge = m.customIamRole ?
        `<span class="badge badge-gold">${badgeLabel} (${m.customIamRole})</span>` :
        `<span class="badge badge-magenta">${m.role.toUpperCase()}</span>`;

      return `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td>${roleBadge}</td>
          <td><span style="font-family: monospace; color: var(--accent-gold);">${m.paradeKey}</span></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="app.openEditMemberModal('${m.userId}')">✏️ Editar / Reset Key</button>
            <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="app.confirmRemoveMember('${m.userId}')">Revocar 🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  toggleRoleProviderFields(prefix = 'invite') {
    const provider = document.getElementById(`${prefix}-role-provider`).value;
    document.getElementById(`${prefix}-group-native`).style.display = provider === 'sinchlor_native' ? 'block' : 'none';
    document.getElementById(`${prefix}-group-aws`).style.display = provider === 'aws_iam' ? 'block' : 'none';
    document.getElementById(`${prefix}-group-lumina`).style.display = provider === 'lumina_role' ? 'block' : 'none';
    document.getElementById(`${prefix}-group-custom`).style.display = provider === 'custom_json' ? 'block' : 'none';
  }

  // 🎪 PARADE MEMBER MANAGEMENT (EVALUATES sinchlor:parade:admin)
  async handleInviteMember(e) {
    e.preventDefault();
    if (!this.canUserExecuteAction('sinchlor:parade:admin')) {
      this.showToast('✖ Acceso Denegado (403): Tu política no permite administrar equipo.', 'error');
      return;
    }

    const userName = document.getElementById('invite-user-name').value.trim();
    const customKey = document.getElementById('invite-custom-parade-key')?.value.trim();
    const provider = document.getElementById('invite-role-provider').value;

    let role = 'viewer';
    let customIamRole = undefined;

    if (provider === 'sinchlor_native') {
      role = document.getElementById('invite-native-role').value;
    } else if (provider === 'aws_iam') {
      role = 'custom_iam';
      const roleName = document.getElementById('invite-aws-role-name').value.trim();
      customIamRole = `aws:iam:${roleName || 'Role-Sinchlor-DevOps'}`;
    } else if (provider === 'lumina_role') {
      role = 'custom_iam';
      customIamRole = document.getElementById('invite-lumina-arn').value.trim() || 'lumina:role:developer';
    } else if (provider === 'custom_json') {
      role = 'custom_iam';
      customIamRole = 'sinchlor:policy:declarative';
      
      const customJsonText = document.getElementById('invite-custom-json').value.trim();
      const exportLumina = document.getElementById('invite-export-lumina').checked;
      const sanct = document.getElementById('invite-custom-sanct').value.trim() || 'default';

      if (exportLumina && customJsonText) {
        try {
          const parsedPolicy = JSON.parse(customJsonText);
          await this.exportPolicyToLumina(`sinchlor_pol_${userName.toLowerCase().replace(/\s+/g, '_')}`, parsedPolicy, sanct);
        } catch {
          this.showToast('⚠️ JSON de política no válido para exportar a Lumina.', 'error');
        }
      }
    }

    if (!this.currentParade) return;

    const userId = `user_${Date.now().toString(36)}`;
    const paradeKey = customKey || `parade_key_${role}_${Math.random().toString(36).slice(2, 10)}`;

    const newMember = {
      userId,
      name: userName,
      paradeKey,
      role,
      provider,
      customIamRole,
      createdAt: new Date().toISOString()
    };

    if (!this.currentParade.members) this.currentParade.members = {};
    this.currentParade.members[userId] = newMember;

    this.closeModal('invite-member-modal');
    await this.saveVaultState(`Invitado miembro ${userName} (${role})`);
    this.showToast(`Miembro '${userName}' invitado con Parade Key: ${paradeKey}`, 'success');
    this.renderAll();
  }

  openEditMemberModal(userId) {
    if (!this.canUserExecuteAction('sinchlor:parade:admin')) {
      this.showToast('✖ Acceso Denegado (403): Tu política no permite administrar equipo.', 'error');
      return;
    }
    if (!this.currentParade || !this.currentParade.members[userId]) return;

    const m = this.currentParade.members[userId];
    document.getElementById('edit-member-id').value = userId;
    document.getElementById('edit-member-name').value = m.name;
    document.getElementById('edit-custom-parade-key').value = m.paradeKey || '';

    let provider = m.provider;
    if (!provider) {
      const roleLower = (m.customIamRole || '').toLowerCase();
      if (roleLower.includes('aws') || roleLower.includes('arn:aws:')) provider = 'aws_iam';
      else if (roleLower.includes('lumina:')) provider = 'lumina_role';
      else if (roleLower.includes('sinchlor:policy:')) provider = 'custom_json';
      else if (m.customIamRole) provider = 'lumina_role';
      else provider = 'sinchlor_native';
    }

    document.getElementById('edit-role-provider').value = provider;
    this.toggleRoleProviderFields('edit');

    if (provider === 'sinchlor_native') {
      document.getElementById('edit-native-role').value = m.role || 'viewer';
    } else if (provider === 'lumina_role') {
      document.getElementById('edit-lumina-arn').value = m.customIamRole || '';
    } else if (provider === 'aws_iam') {
      document.getElementById('edit-aws-role-name').value = m.customIamRole?.replace(/^(aws:iam:|arn:aws:iam::[0-9]+:role\/)/, '') || '';
    }

    this.openModal('edit-member-modal');
  }

  async handleSaveEditMember(e) {
    e.preventDefault();
    if (!this.canUserExecuteAction('sinchlor:parade:admin')) {
      this.showToast('✖ Acceso Denegado (403): Tu política no permite administrar equipo.', 'error');
      return;
    }

    const userId = document.getElementById('edit-member-id').value;
    const name = document.getElementById('edit-member-name').value.trim();
    const customKey = document.getElementById('edit-custom-parade-key').value.trim();
    const provider = document.getElementById('edit-role-provider').value;

    let role = 'viewer';
    let customIamRole = undefined;

    if (provider === 'sinchlor_native') {
      role = document.getElementById('edit-native-role').value;
    } else if (provider === 'aws_iam') {
      role = 'custom_iam';
      const roleName = document.getElementById('edit-aws-role-name').value.trim();
      customIamRole = `aws:iam:${roleName || 'Role-Sinchlor-DevOps'}`;
    } else if (provider === 'lumina_role') {
      role = 'custom_iam';
      customIamRole = document.getElementById('edit-lumina-arn').value.trim() || 'lumina:role:developer';
    } else if (provider === 'custom_json') {
      role = 'custom_iam';
      customIamRole = 'sinchlor:policy:declarative';
      const customJsonText = document.getElementById('edit-custom-json').value.trim();
      const exportLumina = document.getElementById('edit-export-lumina').checked;
      const sanct = document.getElementById('edit-custom-sanct').value.trim() || 'default';

      if (exportLumina && customJsonText) {
        try {
          const parsedPolicy = JSON.parse(customJsonText);
          await this.exportPolicyToLumina(`sinchlor_pol_${name.toLowerCase().replace(/\s+/g, '_')}`, parsedPolicy, sanct);
        } catch {
          this.showToast('⚠️ JSON de política no válido para exportar a Lumina.', 'error');
        }
      }
    }

    if (this.currentParade && this.currentParade.members[userId]) {
      const m = this.currentParade.members[userId];
      m.name = name;
      if (customKey) m.paradeKey = customKey;
      m.role = role;
      m.provider = provider;
      m.customIamRole = customIamRole;

      this.closeModal('edit-member-modal');
      await this.saveVaultState(`Modificado miembro ${name} y actualizada Parade Key`);
      this.showToast(`Miembro '${name}' modificado y Parade Key actualizada. ✏️`, 'success');
      this.renderAll();
    }
  }

  async confirmRemoveMember(userId) {
    if (!this.canUserExecuteAction('sinchlor:parade:admin')) {
      this.showToast('✖ Acceso Denegado (403): Tu política no permite administrar equipo.', 'error');
      return;
    }

    const member = this.currentParade?.members[userId];
    if (!member) return;

    this.openConfirmModal(
      `¿Seguro que deseas revocar a '${member.name}' del parade?`,
      async () => {
        delete this.currentParade.members[userId];
        await this.saveVaultState(`Revocado acceso a ${member.name}`);
        this.showToast(`Acceso revocado a '${member.name}'.`, 'success');
        this.renderAll();
      }
    );
  }

  // 🌺 PETAL ACTIONS & EDIT (EVALUATES sinchlor:petals:write & reveal)
  openEditPetalModal(alias) {
    if (!this.canUserExecuteAction('sinchlor:petals:write')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega modificar pétalos.', 'error');
      return;
    }

    const petals = this.getActivePetals();
    const petal = petals[alias];
    if (!petal) return;

    document.getElementById('edit-petal-old-alias').value = alias;
    document.getElementById('edit-petal-alias').value = petal.alias;
    document.getElementById('edit-petal-category').value = petal.category || '';
    document.getElementById('edit-petal-desc').value = petal.description || '';
    document.getElementById('edit-petal-secret').value = '';
    this.openModal('edit-petal-modal');
  }

  async handleSaveEditPetal(e) {
    e.preventDefault();
    if (!this.canUserExecuteAction('sinchlor:petals:write')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega modificar pétalos (sinchlor:petals:write).', 'error');
      return;
    }

    const oldAlias = document.getElementById('edit-petal-old-alias').value;
    const newAlias = document.getElementById('edit-petal-alias').value.trim().replace(/^\[?sinchlor:/, '').replace(/\]$/, '');
    const category = document.getElementById('edit-petal-category').value.trim() || 'general';
    const desc = document.getElementById('edit-petal-desc').value.trim();
    const newSecret = document.getElementById('edit-petal-secret').value.trim();

    const petals = this.getActivePetals();

    if (petals[oldAlias]) {
      const existing = petals[oldAlias];
      delete petals[oldAlias];

      petals[newAlias] = {
        petalId: existing.petalId,
        alias: newAlias,
        secretValue: newSecret || existing.secretValue,
        category,
        description: desc,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      };

      this.closeModal('edit-petal-modal');
      await this.saveVaultState(`Modificado pétalo sinchlor:${newAlias}`);
      this.showToast(`Pétalo 'sinchlor:${newAlias}' modificado con éxito. 🌺`, 'success');
      this.renderAll();
    }
  }

  async confirmDeletePetal(alias) {
    if (!this.canUserExecuteAction('sinchlor:petals:write')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega eliminar pétalos.', 'error');
      return;
    }

    this.openConfirmModal(
      `¿Deseas eliminar el pétalo semántico 'sinchlor:${alias}'?`,
      async () => {
        const petals = this.getActivePetals();
        delete petals[alias];
        await this.saveVaultState(`Eliminado pétalo sinchlor:${alias}`);
        this.showToast(`Pétalo 'sinchlor:${alias}' eliminado.`, 'success');
        this.renderAll();
      }
    );
  }

  // 🌸 PETALTRAPS ACTIONS
  async triggerTrap(trapId) {
    if (!this.canUserExecuteAction('sinchlor:traps:trigger') && !this.canUserExecuteAction('sinchlor:traps:write')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega probar PetalTraps.', 'error');
      return;
    }

    const traps = this.getActiveTraps();
    const trap = traps[trapId];
    if (!trap) return;

    trap.triggeredCount = (trap.triggeredCount || 0) + 1;
    trap.lastTriggeredAt = new Date().toISOString();

    const target = trap.targetRepo ? `${trap.targetRepo}/${trap.targetFile || ''}` : (trap.targetFile || '.sinchlor-storage');
    await this.saveVaultState(`Probada/Disparada PetalTrap ${trap.alias}`);
    this.showToast(`🌸 ALERTA: PetalTrap '${trap.alias}' probada/disparada en ${target}! Disparos: ${trap.triggeredCount}`, 'info');
    this.renderAll();
  }

  async recreateTrap(trapId) {
    if (!this.canUserExecuteAction('sinchlor:traps:write')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega re-crear PetalTraps.', 'error');
      return;
    }

    const traps = this.getActiveTraps();
    const trap = traps[trapId];
    if (!trap) return;

    trap.decoyToken = this.generateRealisticDecoy(trap.entityType || 'github');
    await this.saveVaultState(`Re-creada PetalTrap ${trap.alias}`);
    this.showToast(`🌸 PetalTrap '${trap.alias}' re-creada con nuevo token señuelo.`, 'success');
    this.renderAll();
  }

  openEditTrapModal(trapId) {
    if (!this.canUserExecuteAction('sinchlor:traps:write')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega modificar PetalTraps.', 'error');
      return;
    }

    const traps = this.getActiveTraps();
    const trap = traps[trapId];
    if (!trap) return;

    const fullLocation = trap.targetRepo ? `${trap.targetRepo}/${trap.targetFile || ''}` : (trap.targetFile || '');

    document.getElementById('edit-trap-id').value = trap.trapId;
    document.getElementById('edit-trap-alias').value = trap.alias;
    document.getElementById('edit-trap-entity-type').value = trap.entityType || 'github';
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

  async handleSaveEditTrap(e) {
    e.preventDefault();
    if (!this.canUserExecuteAction('sinchlor:traps:write')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega modificar PetalTraps.', 'error');
      return;
    }

    const trapId = document.getElementById('edit-trap-id').value;
    const alias = document.getElementById('edit-trap-alias').value.trim();
    const entityType = document.getElementById('edit-trap-entity-type').value;
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

    const traps = this.getActiveTraps();

    if (traps[trapId]) {
      const oldType = traps[trapId].entityType;
      traps[trapId].alias = alias;
      traps[trapId].targetRepo = targetRepo;
      traps[trapId].targetFile = targetFile;
      
      if (oldType !== entityType || !traps[trapId].decoyToken) {
        traps[trapId].entityType = entityType;
        traps[trapId].decoyToken = this.generateRealisticDecoy(entityType);
      }

      traps[trapId].alertChannels = {
        githubIssue: enableGithub,
        githubIssueRepo: enableGithub ? githubRepo : undefined,
        discordWebhook: enableDiscord ? discordUrl : undefined,
        telegramBotToken: enableTelegram ? tgToken : undefined,
        telegramChatId: enableTelegram ? tgChat : undefined
      };

      this.closeModal('edit-trap-modal');
      await this.saveVaultState(`Modificada PetalTrap ${alias} (Señuelo: ${entityType})`);
      this.showToast(`PetalTrap '${alias}' modificada con éxito (Formato Señuelo: ${entityType.toUpperCase()}). 🌸`, 'success');
      this.renderAll();
    }
  }

  async confirmDeleteTrap(trapId) {
    if (!this.canUserExecuteAction('sinchlor:traps:write')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega eliminar PetalTraps.', 'error');
      return;
    }

    const traps = this.getActiveTraps();
    const trap = traps[trapId];
    if (!trap) return;

    this.openConfirmModal(
      `¿Deseas eliminar la PetalTrap '${trap.alias}'?`,
      async () => {
        delete traps[trapId];
        await this.saveVaultState(`Eliminada PetalTrap ${trap.alias}`);
        this.showToast(`PetalTrap '${trap.alias}' eliminada.`, 'success');
        this.renderAll();
      }
    );
  }

  // 🏵️ NECTAR EFIMERO ACTIONS
  async consumeNectar(nectarId) {
    if (!this.canUserExecuteAction('sinchlor:nectar:consume')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega consumir néctar.', 'error');
      return;
    }

    const nectars = this.getActiveNectars();
    const nectar = nectars[nectarId];
    if (!nectar) return;

    if (nectar.used) {
      this.showToast(`❌ El néctar '${nectar.alias}' ya fue consumido.`, 'error');
      return;
    }

    if (nectar.singleUse) {
      nectar.used = true;
      nectar.usedAt = new Date().toISOString();
      await this.saveVaultState(`Consumido néctar autodestruido ${nectar.alias}`);
      this.showToast(`🏵️ Néctar '${nectar.alias}' consumido: "${nectar.secretValue}" (Autodestruido)`, 'success');
    } else {
      this.showToast(`🏵️ Néctar '${nectar.alias}' obtenido: "${nectar.secretValue}"`, 'info');
    }

    this.renderAll();
  }

  openEditNectarModal(nectarId) {
    if (!this.canUserExecuteAction('sinchlor:nectar:create')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega modificar néctar.', 'error');
      return;
    }

    const nectars = this.getActiveNectars();
    const nectar = nectars[nectarId];
    if (!nectar) return;

    document.getElementById('edit-nectar-id').value = nectar.nectarId;
    document.getElementById('edit-nectar-alias').value = nectar.alias;
    document.getElementById('edit-nectar-secret').value = '';
    document.getElementById('edit-nectar-single-use').checked = !!nectar.singleUse;
    document.getElementById('edit-nectar-reactivate').checked = false;

    this.openModal('edit-nectar-modal');
  }

  async handleSaveEditNectar(e) {
    e.preventDefault();
    if (!this.canUserExecuteAction('sinchlor:nectar:create')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega modificar néctar.', 'error');
      return;
    }

    const nectarId = document.getElementById('edit-nectar-id').value;
    const alias = document.getElementById('edit-nectar-alias').value.trim();
    const secret = document.getElementById('edit-nectar-secret').value.trim();
    const ttlMins = parseInt(document.getElementById('edit-nectar-ttl').value || '15', 10);
    const singleUse = document.getElementById('edit-nectar-single-use').checked;
    const reactivate = document.getElementById('edit-nectar-reactivate').checked;

    const nectars = this.getActiveNectars();

    if (nectars[nectarId]) {
      nectars[nectarId].alias = alias;
      nectars[nectarId].singleUse = singleUse;

      if (secret) nectars[nectarId].secretValue = secret;
      if (ttlMins > 0) {
        nectars[nectarId].expiresAt = new Date(Date.now() + ttlMins * 60000).toISOString();
      }

      if (reactivate) {
        nectars[nectarId].used = false;
        delete nectars[nectarId].usedAt;
      }

      this.closeModal('edit-nectar-modal');
      await this.saveVaultState(`Modificado néctar ${alias}`);
      this.showToast(`Néctar '${alias}' modificado con éxito. 🏵️`, 'success');
      this.renderAll();
    }
  }

  async confirmDeleteNectar(nectarId) {
    if (!this.canUserExecuteAction('sinchlor:nectar:create')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega eliminar néctar.', 'error');
      return;
    }

    const nectars = this.getActiveNectars();
    const nectar = nectars[nectarId];
    if (!nectar) return;

    this.openConfirmModal(
      `¿Deseas eliminar el néctar efímero '${nectar.alias}'?`,
      async () => {
        delete nectars[nectarId];
        await this.saveVaultState(`Eliminado néctar ${nectar.alias}`);
        this.showToast(`Néctar '${nectar.alias}' eliminado.`, 'success');
        this.renderAll();
      }
    );
  }

  // 🌺 PETAL CREATION
  async handleCreatePetal(e) {
    e.preventDefault();
    if (!this.canUserExecuteAction('sinchlor:petals:write')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega crear pétalos (sinchlor:petals:write).', 'error');
      return;
    }

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

    const petals = this.getActivePetals();
    petals[cleanAlias] = petal;

    this.closeModal('create-petal-modal');
    await this.saveVaultState(`Creado pétalo sinchlor:${cleanAlias}`);
    this.showToast(`Pétalo 'sinchlor:${cleanAlias}' guardado con éxito! 🌺`, 'success');
    this.renderAll();
  }

  openRevealModal(alias) {
    if (!this.canUserExecuteAction('sinchlor:petals:reveal')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega revelar secretos (sinchlor:petals:reveal).', 'error');
      return;
    }

    const petals = this.getActivePetals();
    const petal = petals[alias];
    if (!petal) return;

    this.logParadeAction(`Reveló el secreto del pétalo sinchlor:${alias}`);
    document.getElementById('reveal-alias-display').value = `sinchlor:${alias}`;
    document.getElementById('reveal-secret-output').value = petal.secretValue;
    this.openModal('reveal-petal-modal');
  }

  // 🌸 PETALTRAP CREATION
  async handleCreateTrap(e) {
    e.preventDefault();
    if (!this.canUserExecuteAction('sinchlor:traps:write')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega plantar PetalTraps.', 'error');
      return;
    }

    const alias = document.getElementById('trap-alias').value.trim();
    const entityType = document.getElementById('trap-entity-type').value;
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
      entityType,
      targetRepo: targetRepo || 'amglogicalis/mi-app',
      targetFile: targetFile || 'src/config.js',
      decoyToken: this.generateRealisticDecoy(entityType),
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

    const traps = this.getActiveTraps();
    traps[trapId] = trap;

    this.closeModal('create-trap-modal');
    await this.saveVaultState(`Plantada PetalTrap ${cleanAlias}`);
    this.showToast(`PetalTrap '${cleanAlias}' plantada con éxito! 🌸`, 'success');
    this.renderAll();
  }

  async handleCreateNectar(e) {
    e.preventDefault();
    if (!this.canUserExecuteAction('sinchlor:nectar:create')) {
      this.showToast('✖ Acceso Denegado (403): Tu política deniega emitir néctar (sinchlor:nectar:create).', 'error');
      return;
    }

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

    const nectars = this.getActiveNectars();
    nectars[nectarId] = nectar;

    this.closeModal('create-nectar-modal');
    await this.saveVaultState(`Emitido Néctar Efímero ${cleanAlias}`);
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
