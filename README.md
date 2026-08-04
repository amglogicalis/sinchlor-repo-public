<p align="center">
  <img src="assets/logo_sinchlor.png" alt="Sinchlor Logo" width="220" />
</p>

# 🛡️ SINCHLOR — Public Secrets Camouflage & Credentials Engine

<p align="center">
  <b>Terra Ecosystem • Secrets Camouflage, Credential Masking & Ephemeral Credentials Engine at $0 Server Cost</b>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/terra-sinchlor"><img src="https://img.shields.io/badge/npm-terra--sinchlor-f93318.svg?style=for-the-badge&logo=npm" alt="NPM Package" /></a>
  <a href="https://amglogicalis.github.io/sinchlor-repo-public/"><img src="https://img.shields.io/badge/Sinchlor%20Studio-ONLINE-10b981.svg?style=for-the-badge&logo=githubpages" alt="Live Console" /></a>
  <a href="https://github.com/amglogicalis/sinchlor-repo-public"><img src="https://img.shields.io/badge/Server%20Cost-%240%20Forever-f59e0b.svg?style=for-the-badge" alt="Zero Server Cost" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" /></a>
</p>

---

## 💡 ¿Qué es SINCHLOR?

**SINCHLOR** es el motor de camuflaje de secretos, enmascaramiento de credenciales y credenciales efímeras del **Ecosistema Terra** (inspirado en la oruga camaleónica *Synchlora aerata*).

Así como el **DNS** convirtió las direcciones IP numéricas e ilegibles (`192.168.1.1`) en nombres de dominio legibles (`google.com`), **SINCHLOR actúa como el DNS para Credenciales y Secretos**: convirtiendo tokens crudos y de alto riesgo (`ghp_...`, `sk-proj-...`, `AKIA...`) en **Pétalos Semánticos** legibles (`sinchlor:alias` y `[sinchlor:alias]`).

Los secretos reales **jamás se guardan en texto plano en disco ni repositorios**. Se resuelven en **memoria RAM únicamente** durante la ejecución de los procesos, con **$0 de coste en servidores** y **cero dependencias externas**.

---

## 🌐 Consola Web Online & Local (Sinchlor Studio)

Accede a la consola interactiva de Sinchlor directamente desde la web o ejecútala de forma local offline:

👉 **[ACCEDER A LA CONSOLA WEB ONLINE DE SINCHLOR](https://amglogicalis.github.io/sinchlor-repo-public/)**

<p align="center">
  <img src="assets/preview_consola_web.PNG" alt="Sinchlor Studio Web Console Preview" width="100%" style="border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" />
</p>

### Características de la Consola Web:
- **Modo Bóveda Personal (Personal Vault)**: Administra tus Pétalos,Trampas y Néctares individuales.
- **Modo Desfile de Equipo (Sinchlor Parade)**: Gestión multi-usuario con aislamiento total de recursos y roles granulares (Admin, Editor, Viewer, Lumina Declarative JSON y AWS IAM).
- **Consola Local Offline**: Lanza un servidor HTTP estático local con `sinchlor console` en `http://localhost:3720`.

---

## 🚀 Instalación Rápida por NPM (Única Forma de Uso Terminal / SDK)

> [!IMPORTANT]
> **La ÚNICA forma de utilizar SINCHLOR desde la consola de comandos (CLI) o integrarlo como SDK en tus proyectos de código es mediante la instalación de su paquete oficial en NPM (`terra-sinchlor`).**

```bash
# 1. Instalación global desde NPM (Requerido para comandos CLI en terminal)
npm install -g terra-sinchlor

# 2. Configurar auto-inicio de contexto en terminal y guardián git pre-commit
sinchlor setup

# 3. Verificar versión e instalación correcta
sinchlor --version
```

### 📦 Instalación Local en Proyecto (Para SDK de Node.js / TypeScript)
```bash
npm install terra-sinchlor
```

---

## 💻 Referencia Completa de Comandos CLI

El CLI de **Sinchlor** ofrece comandos 100% sincronizados con la Consola Web y el SDK:

### 1. 🌐 Consola Web Local (Offline)
```bash
# Abrir consola web local en puerto por defecto (http://localhost:3720)
sinchlor console

# Abrir en puerto personalizado
sinchlor studio --port 4000
```

### 2. 🌺 Pétalos Semánticos (Semantic Aliases)
| Comando | Descripción | Flags / Argumentos |
| :--- | :--- | :--- |
| `sinchlor petal create` | Registra un nuevo pétalo semántico. | `--alias <nombre> --secret <token> [--desc <texto>] [--cat <categoria>]` |
| `sinchlor petal list` | Lista todos los pétalos semánticos registrados. | *(Ninguno)* |
| `sinchlor petal reveal` | Muestra el secret real desofuscado en pantalla. | `--alias <nombre> [--pin <pin>]` |
| `sinchlor petal rotate` | **Ecdysis**: Muta/rota la clave real conservando el alias. | `--alias <nombre> --secret <nuevoSecret>` |
| `sinchlor petal delete` | Elimina un pétalo semántico de la bóveda. | `--alias <nombre>` |

#### Ejemplos CLI:
```bash
# Crear pétalo
sinchlor petal create --alias gh-readonly --secret ghp_1234567890abcdef --cat github --desc "Token de lectura"

# Mutar clave manteniendo el alias (Ecdysis)
sinchlor petal rotate --alias gh-readonly --secret ghp_NUEVOTOKEN99999999

# Eliminar pétalo
sinchlor petal delete --alias gh-readonly
```

### 3. 🛡️ PetalShield (Escáner de Fugas)
```bash
# Escanear un archivo local en busca de tokens expuestos
sinchlor scan --file src/config.js

# Escanear una cadena de texto directamente
sinchlor scan --code "const apiKey = 'AKIA1234567890ABCDEF';"
```

### 4. ⚡ Ejecución Proxy en Memoria RAM
```bash
# Activar o desactivar contexto global
sinchlor on
sinchlor off

# Ejecutar cualquier proceso hijo resolviendo los alias [sinchlor:alias] exclusivamente en RAM
sinchlor run -- node app.js
sinchlor run -- python script.py
```

### 5. 🎪 Sinchlor Parades (Equipos, RBAC & Políticas Granulares)
| Comando | Descripción | Flags / Argumentos |
| :--- | :--- | :--- |
| `sinchlor parade create` | Crea un nuevo Parade (Desfile de Equipo). | `--name <nombreParade> --admin <nombreAdmin>` |
| `sinchlor parade login` | Inicia sesión CLI en un Parade específico. | `--parade <nombre> --key <paradeKey>` |
| `sinchlor parade logout` | Resetea el contexto CLI a la Bóveda Personal. | *(Ninguno)* |
| `sinchlor parade members` | Lista los integrantes del Parade activo. | `[--parade <nombre>]` |
| `sinchlor parade audit` | Muestra los registros de auditoría del Parade. | `[--parade <nombre>]` |
| `sinchlor parade invite` | Invita un usuario generando o asignando su Parade Key. | `--parade <p> --admin-key <ak> --user <u> [--role <r>] [--iam-role <iam>] [--key <customKey>]` |
| `sinchlor parade edit-member` | Modifica rol, alias o Parade Key de un miembro. | `--parade <p> --admin-key <ak> --user-id <uid> [--user <u>] [--role <r>] [--iam-role <iam>] [--key <customKey>]` |
| `sinchlor parade remove` | Revoca y elimina un integrante del Parade. | `--parade <p> --admin-key <ak> --user-id <uid>` |
| `sinchlor parade delete` | Elimina permanentemente el Parade. | `--parade <p> --admin-key <ak>` |

#### Ejemplos CLI:
```bash
# Crear Parade
sinchlor parade create --name "DevOps Team" --admin "Adrian Lead"

# Invitar miembro con Parade Key personalizada y rol AWS IAM
sinchlor parade invite --parade "DevOps Team" --admin-key "parade_key_admin123" --user "DevBot" --iam-role "arn:aws:iam::123456789012:role/TerraDevOps" --key "my_secret_pass_123"

# Iniciar sesión CLI en el Parade
sinchlor parade login --parade "DevOps Team" --key "my_secret_pass_123"

# Cerrar sesión del Parade y volver a Bóveda Personal
sinchlor parade logout
```

### 6. 🌸 PetalTraps (Honeytokens & Alertas de Intrusión)
| Comando | Descripción | Flags / Argumentos |
| :--- | :--- | :--- |
| `sinchlor trap create` | Plantar una trampa señuelo con canales de alerta. | `--alias <a> [--file <f>] [--repo <r>] [--entity <type>] [--discord <url>] [--telegram-token <t>] [--telegram-chat <c>]` |
| `sinchlor trap list` | Listar todas las trampas señuelo plantadas. | *(Ninguno)* |
| `sinchlor trap edit` | Modificar trampa o cambiar proveedor del señuelo. | `--id <id/alias> [--new-alias <na>] [--repo <r>] [--file <f>] [--entity <type>] [--discord <url>]` |
| `sinchlor trap trigger` | Probar el disparo y envío de alertas de una trampa. | `--id <id/alias>` |
| `sinchlor trap delete` | Eliminar una trampa señuelo. | `--id <id/alias>` |

#### Proveedores de Tokens Señuelo Soportados (`--entity` / `--type`):
- `github`: GitHub PAT (`ghp_` + 36 Base62)
- `aws`: AWS Access Key (`AKIA` + 16 Upper Base36)
- `stripe`: Stripe Secret Key (`sk_live_` + 24 Base62)
- `openai`: OpenAI Project Key (`sk-proj-` + 48 Base62)
- `credit_card`: Tarjeta de Crédito con Checksum Luhn Válido

#### Ejemplo CLI:
```bash
# Crear trampa con formato AWS y canal de Discord
sinchlor trap create --alias aws-decoy-trap --entity aws --discord "https://discord.com/api/webhooks/..."

# Cambiar el proveedor del señuelo a OpenAI
sinchlor trap edit --alias aws-decoy-trap --type openai
```

### 7. 🏵️ Néctar Efímero (TTL & 1-Solo Uso)
| Comando | Descripción | Flags / Argumentos |
| :--- | :--- | :--- |
| `sinchlor nectar create` | Emitir una credencial efímera con TTL. | `--alias <a> --secret <s> [--ttl <minutos>] [--single-use true/false]` |
| `sinchlor nectar list` | Listar néctares activos y estado de expiración. | *(Ninguno)* |
| `sinchlor nectar edit` | Modificar néctar (fijar `--ttl 0` para permanente). | `--id <id/alias> [--new-alias <na>] [--secret <s>] [--ttl <minutos>] [--single-use true/false] [--reactivate true]` |
| `sinchlor nectar consume` | Consumir el néctar (autodestruye si es 1-Solo Uso). | `--id <id/alias>` |
| `sinchlor nectar delete` | Eliminar permanentemente un néctar efímero. | `--id <id/alias>` |

#### Ejemplo CLI:
```bash
# Crear néctar de 15 minutos con autodestrucción tras 1-Solo Uso
sinchlor nectar create --alias temp-db-pass --secret "super_secret_db_pass" --ttl 15 --single-use true

# Modificar a permanente (TTL = 0)
sinchlor nectar edit --alias temp-db-pass --ttl 0

# Consumir néctar
sinchlor nectar consume --id temp-db-pass
```

---

## 🛠️ SDK de Node.js & TypeScript

Instala e integra **Sinchlor** directamente en tus proyectos Node.js / TypeScript:

```typescript
import { Sinchlor } from 'terra-sinchlor';

// 1. Inicializar cliente con GitHub Token (Bóveda remota en GitHub Pages / Storage)
const sinchlor = new Sinchlor({
  githubToken: process.env.GITHUB_TOKEN!
});

await sinchlor.init();

// 2. Crear Pétalo Semántico
const petal = await sinchlor.createPetal('db-connection-string', 'postgres://user:pass@localhost:5432/db');

// 3. Resolver plantilla en memoria RAM
const resolvedText = sinchlor.resolveString('DATABASE_URL=sinchlor:db-connection-string');
console.log(resolvedText); // 'DATABASE_URL=postgres://user:pass@localhost:5432/db'

// 4. Mutar clave manteniendo el alias (Ecdysis)
await sinchlor.rotatePetal('db-connection-string', 'postgres://user:new_pass@localhost:5432/db');

// 5. Emitir Néctar Efímero de 10 minutos
const nectar = await sinchlor.createNectar('temp-aws-key', 'AKIAIOSFODNN7EXAMPLE', 600, true);

// 6. Consumir Néctar
const secretValue = sinchlor.consumeNectar(nectar.nectarId);

// 7. Modificar Néctar a permanente (TTL = 0)
await sinchlor.updateNectar(nectar.nectarId, { ttlSeconds: 0 });

// 8. Plantar PetalTrap (Honeytoken)
const trap = await sinchlor.createTrap('honeypot-token', { discordWebhook: 'https://discord.com/api/webhooks/...' }, 'my-org/my-repo', 'src/config.js', 'aws');

// 9. Modificar trampa y cambiar proveedor a OpenAI
await sinchlor.updateTrap(trap.trapId, { entityType: 'openai' });
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**.

<p align="center">
  <b>Desarrollado para el Ecosistema Terra • $0 Coste de Servidores • Privacidad Absoluta</b>
</p>
