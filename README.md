# 🛡️ SINCHLOR — Public Secrets Camouflage & Credentials Engine

<p align="center">
  <b>Terra Ecosystem • Secrets Camouflage, Credential Masking & Ephemeral Credentials Engine at $0 Cost</b>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/terra-sinchlor"><img src="https://img.shields.io/badge/npm-terra--sinchlor-f93318.svg?style=for-the-badge&logo=npm" alt="NPM Package" /></a>
  <a href="https://amglogicalis.github.io/sinchlor-repo-public/"><img src="https://img.shields.io/badge/Sinchlor%20Studio-ONLINE-10b981.svg?style=for-the-badge&logo=githubpages" alt="Live Console" /></a>
  <a href="https://github.com/amglogicalis/sinchlor-repo-public"><img src="https://img.shields.io/badge/Server%20Cost-%240%20Forever-f59e0b.svg?style=for-the-badge" alt="Zero Server Cost" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" /></a>
</p>

---

## 💡 What is SINCHLOR?

**SINCHLOR** is the secrets camouflage, credential masking, and ephemeral credentials engine of the **Terra Ecosystem** (inspired by the *Synchlora aerata* camouflage caterpillar).

Just like **DNS** translated unreadable IP addresses (`192.168.1.1`) into human-readable domain names (`google.com`), **SINCHLOR** acts as the **DNS for Credentials & Secrets**: converting unreadable, risky raw tokens (`ghp_...`, `sk-proj-...`, `AKIA...`) into human-readable **Semantic Petals** (`sinchlor:alias` and `[sinchlor:alias]`).

It resolves real credentials in **RAM memory only** during process execution with **$0 server overhead** and **zero dependencies**.

---

## 🚀 Quick Start & Installation

```bash
# Install globally from NPM
npm install -g terra-sinchlor

# Setup shell auto-start & global pre-commit guard
sinchlor setup

# Verify installation
sinchlor --version
```

---

## 💻 CLI Commands Reference

### 🌐 Abrir Consola Web Local (Offline en Localhost)
```bash
# Abrir consola web local en puerto por defecto (http://localhost:3720)
sinchlor console

# O en puerto personalizado:
sinchlor studio --port 4000
```

### 🌺 Pétalos Semánticos (Semantic Aliases)
```bash
# Crear un pétalo semántico
sinchlor petal create --alias gh-read --secret ghp_1234567890abcdefghijklmnopqrstuvwxyz

# Listar pétalos registrados
sinchlor petal list

# Revelar secret en pantalla (protegido por PIN maestro)
sinchlor petal reveal --alias gh-read

# Eliminar un pétalo
sinchlor petal delete --alias gh-read
```

### ⚡ Ejecución Proxy en Memoria RAM
```bash
# Ejecutar cualquier proceso hijo con resolución de secretos en RAM
sinchlor run -- node app.js
```

### 🎪 Sinchlor Parades (Desfile en Equipo & RBAC)
```bash
# 1. Crear un Sinchlor Parade (Exclusivo en Terminal/SDK)
sinchlor parade create --name "Frontend Team" --admin "Carlos Lead"

# 2. Invitar un miembro con rol granular o rol Lumina/AWS IAM
sinchlor parade invite --parade "Frontend Team" --admin-key "parade_key_admin_xyz" --user "Ana Dev" --role editor --iam-role "lumina:role:developer"

# 3. Listar Parades
sinchlor parade list

# 4. Eliminar miembro
sinchlor parade remove --parade "Frontend Team" --admin-key "parade_key_admin_xyz" --user-id "user_123"

# 5. Eliminar Parade
sinchlor parade delete --parade "Frontend Team" --admin-key "parade_key_admin_xyz"
```

### 🌸 PetalTraps (Honeytokens / Trampas)
```bash
# Plantar una trampa con alertas a Discord / Telegram / GitHub Issues
sinchlor trap create --alias trap-gh-pat --discord "https://discord.com/api/webhooks/..."

# Probar disparo de trampa
sinchlor trap trigger --id trap_xyz123
```

### 🏵️ Néctar Efímero (TTL & 1-Solo Uso)
```bash
# Emitir crédito con TTL de 15 minutos y autodestrucción tras 1-Solo Uso
sinchlor nectar issue --alias temp-aws-key --secret AKIAIOSFODNN7EXAMPLE --ttl 15 --single-use
```

---

## 🛠️ Node.js & TypeScript SDK Usage

```typescript
import { Sinchlor } from 'terra-sinchlor';

const sinchlor = new Sinchlor({
  githubToken: process.env.GITHUB_TOKEN!
});

// Load Vault
await sinchlor.init();

// 1. Create a Semantic Petal
const petal = await sinchlor.createPetal('gh-readonly', 'ghp_1234567890abcdefghijklmnopqrstuvwxyz');

// 2. Resolve string in RAM
const resolved = sinchlor.resolveString('Authorization: Bearer sinchlor:gh-readonly');

// 3. Create a Sinchlor Parade (Team Vault)
const parade = await sinchlor.createParade('Backend Squad', 'Lead Dev');

// 4. Issue Ephemeral Nectar (Single-Use)
const nectar = await sinchlor.createNectar('one-time-key', 'secret_val_123', 15, true);
```

---

## 🌐 Live Online Console

Access the official SINCHLOR Studio hosted on GitHub Pages:
👉 **[https://amglogicalis.github.io/sinchlor-repo-public/](https://amglogicalis.github.io/sinchlor-repo-public/)**

---

<p align="center">
  <b>Powered by Terra Ecosystem • $0 Monthly Server Cost • MIT License</b>
</p>
