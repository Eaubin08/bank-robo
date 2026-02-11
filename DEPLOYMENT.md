# Guide de Déploiement Vultr - Bank Safety Lab

Ce guide détaille le déploiement du **Bank Safety Lab** sur Vultr VM pour le hackathon Launch Fund AI × Robotics.

---

## 🎯 Architecture de Déploiement

\`\`\`
┌─────────────────────────────────────┐
│         Vultr VM (Backend)          │
│   Ubuntu 22.04 LTS + Node.js        │
│   Express + tRPC + MySQL            │
│   Port 3000 (HTTP)                  │
└────────────────┬────────────────────┘
                 │
                 │ tRPC API
                 │ /api/trpc/*
                 │
┌────────────────▼────────────────────┐
│      Frontend (Hébergé sur Manus)   │
│   React + Chart.js                  │
│   Fetch API vers Vultr              │
└─────────────────────────────────────┘
\`\`\`

---

## 📋 Prérequis

### Vultr VM
- ✅ Compte Vultr actif
- ✅ VM Ubuntu 22.04 LTS (minimum 2 vCPU, 4 GB RAM)
- ✅ Accès SSH root
- ✅ Port 3000 ouvert (HTTP)

### Services Externes
- ✅ Base de données MySQL/TiDB (peut être sur Vultr ou externe)
- ✅ Gemini API key (via Manus ou Google Cloud)

---

## 🚀 Partie 1 : Créer une VM Vultr

### Étape 1 : Déployer une Instance

1. **Se connecter à Vultr** : https://my.vultr.com/
2. **Déployer une nouvelle instance** :
   - **Type** : Cloud Compute
   - **Location** : Choisir la région la plus proche (ex: Paris, France)
   - **OS** : Ubuntu 22.04 LTS x64
   - **Plan** : Regular Performance
     - **Recommandé** : 2 vCPU, 4 GB RAM, 80 GB SSD ($18/mois)
     - **Minimum** : 1 vCPU, 2 GB RAM, 55 GB SSD ($12/mois)
   - **Hostname** : `bank-safety-backend`
3. **Attendre le déploiement** (2-3 minutes)
4. **Noter l'adresse IP** : `YOUR_VULTR_IP`

### Étape 2 : Configurer le Pare-feu

Dans le panneau Vultr, aller dans **Settings → Firewall** :

\`\`\`
Allow SSH (22/tcp) from your IP
Allow HTTP (3000/tcp) from anywhere
\`\`\`

---

## 🔧 Partie 2 : Configuration du Serveur

### Étape 1 : Connexion SSH

\`\`\`bash
ssh root@YOUR_VULTR_IP
\`\`\`

**Note** : Le mot de passe root est disponible dans le panneau Vultr.

### Étape 2 : Mise à Jour du Système

\`\`\`bash
apt update && apt upgrade -y
\`\`\`

### Étape 3 : Installation de Node.js 22

\`\`\`bash
# Installer Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Vérifier les versions
node --version  # Devrait afficher v22.x.x
npm --version
\`\`\`

### Étape 4 : Installation de pnpm

\`\`\`bash
npm install -g pnpm
pnpm --version
\`\`\`

### Étape 5 : Installation de Git

\`\`\`bash
apt install -y git
\`\`\`

---

## 📦 Partie 3 : Déploiement de l'Application

### Étape 1 : Cloner le Repository

\`\`\`bash
cd /root
git clone https://github.com/YOUR_USERNAME/bank-safety-hackathon.git
cd bank-safety-hackathon
\`\`\`

### Étape 2 : Installer les Dépendances

\`\`\`bash
pnpm install
\`\`\`

### Étape 3 : Configurer les Variables d'Environnement

Créer le fichier \`.env\` :

\`\`\`bash
nano .env
\`\`\`

Ajouter les variables suivantes :

\`\`\`env
# Database
DATABASE_URL="mysql://user:password@host:3306/database"

# JWT Secret
JWT_SECRET="your-random-jwt-secret-here"

# Manus OAuth (si utilisé)
VITE_APP_ID="your-app-id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"

# Gemini AI (via Manus)
BUILT_IN_FORGE_API_KEY="your-manus-api-key"
BUILT_IN_FORGE_API_URL="https://api.manus.im/forge"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-api-key"
VITE_FRONTEND_FORGE_API_URL="https://api.manus.im/forge"

# Owner Info
OWNER_OPEN_ID="your-open-id"
OWNER_NAME="Your Name"
\`\`\`

**Sauvegarder** : `Ctrl+O`, `Enter`, `Ctrl+X`

### Étape 4 : Configurer la Base de Données

\`\`\`bash
pnpm db:push
\`\`\`

### Étape 5 : Build de l'Application

\`\`\`bash
pnpm build
\`\`\`

### Étape 6 : Tester le Démarrage

\`\`\`bash
pnpm start
\`\`\`

**Tester depuis votre machine locale** :
\`\`\`bash
curl http://YOUR_VULTR_IP:3000/api/trpc/banking.getScenarios
\`\`\`

**Arrêter le serveur** : `Ctrl+C`

---

## 🔄 Partie 4 : Configuration du Service Systemd

Pour que l'application redémarre automatiquement après un reboot :

### Étape 1 : Créer le Fichier Service

\`\`\`bash
nano /etc/systemd/system/bank-safety.service
\`\`\`

### Étape 2 : Ajouter le Contenu

\`\`\`ini
[Unit]
Description=Bank Safety Lab Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/bank-safety-hackathon
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
\`\`\`

**Sauvegarder** : `Ctrl+O`, `Enter`, `Ctrl+X`

### Étape 3 : Activer et Démarrer le Service

\`\`\`bash
systemctl daemon-reload
systemctl enable bank-safety
systemctl start bank-safety
\`\`\`

### Étape 4 : Vérifier le Statut

\`\`\`bash
systemctl status bank-safety
\`\`\`

### Étape 5 : Voir les Logs

\`\`\`bash
journalctl -u bank-safety -f
\`\`\`

---

## 🌐 Partie 5 : Configuration du Frontend

### Option 1 : Hébergement sur Manus (Recommandé)

Le frontend est déjà hébergé sur Manus. Il suffit de mettre à jour l'URL du backend dans les variables d'environnement Manus.

### Option 2 : Hébergement sur Vultr (Optionnel)

Si vous voulez héberger le frontend sur Vultr également :

#### Installer Nginx

\`\`\`bash
apt install -y nginx
\`\`\`

#### Configurer Nginx

\`\`\`bash
nano /etc/nginx/sites-available/default
\`\`\`

Remplacer par :

\`\`\`nginx
server {
    listen 80;
    server_name YOUR_VULTR_IP;
    
    # Frontend
    location / {
        root /root/bank-safety-hackathon/client/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

**Redémarrer Nginx** :

\`\`\`bash
systemctl restart nginx
\`\`\`

**Accéder au frontend** : `http://YOUR_VULTR_IP`

---

## 🧪 Partie 6 : Tests de Validation

### Test 1 : Backend Health Check

\`\`\`bash
curl http://YOUR_VULTR_IP:3000/api/trpc/banking.getScenarios
\`\`\`

**Réponse attendue** : JSON avec 23 scénarios

### Test 2 : Process Transaction

\`\`\`bash
curl -X POST http://YOUR_VULTR_IP:3000/api/trpc/banking.processTransaction \\
  -H "Content-Type: application/json" \\
  -d '{}'
\`\`\`

**Réponse attendue** : JSON avec décision, métriques, et analyse Gemini

### Test 3 : Frontend → Backend

1. **Ouvrir le frontend** : `http://YOUR_VULTR_IP` (si hébergé sur Vultr) ou URL Manus
2. **Ouvrir la console** : `F12`
3. **Lancer la simulation** : Cliquer sur "Démarrer"
4. **Vérifier les logs** : Requêtes vers `/api/trpc/*` avec status 200

---

## 🔍 Partie 7 : Dépannage

### Problème 1 : Backend ne démarre pas

**Symptôme** : Erreur `Address already in use`

**Solution** :
\`\`\`bash
# Trouver le processus sur le port 3000
lsof -i :3000

# Tuer le processus
kill -9 <PID>

# Relancer le backend
systemctl restart bank-safety
\`\`\`

### Problème 2 : CORS Error dans le Frontend

**Symptôme** : `Access-Control-Allow-Origin` error dans la console

**Solution** : Vérifier que le middleware CORS est activé dans `server/_core/index.ts`

### Problème 3 : Database Connection Error

**Symptôme** : `Error: connect ECONNREFUSED`

**Solution** : Vérifier que `DATABASE_URL` dans `.env` est correct et que la base de données est accessible

### Problème 4 : Gemini API Error

**Symptôme** : `Gemini analysis unavailable`

**Solution** : Vérifier que `BUILT_IN_FORGE_API_KEY` est correct dans `.env`

---

## 📊 Partie 8 : Monitoring et Logs

### Voir les Logs du Backend

\`\`\`bash
# Logs en temps réel
journalctl -u bank-safety -f

# Dernières 100 lignes
journalctl -u bank-safety -n 100

# Logs d'aujourd'hui
journalctl -u bank-safety --since today
\`\`\`

### Monitoring des Ressources

\`\`\`bash
# CPU et RAM
htop

# Espace disque
df -h

# Trafic réseau
iftop
\`\`\`

---

## 🔄 Partie 9 : Mise à Jour du Code

### Backend

\`\`\`bash
cd /root/bank-safety-hackathon
git pull origin main
pnpm install
pnpm build
systemctl restart bank-safety
\`\`\`

### Frontend (si hébergé sur Vultr)

\`\`\`bash
cd /root/bank-safety-hackathon
git pull origin main
pnpm install
pnpm build
systemctl restart nginx
\`\`\`

---

## 🔒 Partie 10 : Sécurité

### Recommandations de Sécurité

1. **Changer le mot de passe root** :
\`\`\`bash
passwd
\`\`\`

2. **Créer un utilisateur non-root** :
\`\`\`bash
adduser banksafety
usermod -aG sudo banksafety
\`\`\`

3. **Désactiver l'authentification par mot de passe SSH** :
\`\`\`bash
nano /etc/ssh/sshd_config
# Changer: PasswordAuthentication no
systemctl restart sshd
\`\`\`

4. **Installer Fail2Ban** :
\`\`\`bash
apt install -y fail2ban
systemctl enable fail2ban
\`\`\`

5. **Configurer UFW (Firewall)** :
\`\`\`bash
ufw allow 22/tcp
ufw allow 3000/tcp
ufw enable
\`\`\`

---

## 🎯 Checklist de Déploiement

- [ ] VM Vultr créée et accessible via SSH
- [ ] Node.js 22 et pnpm installés
- [ ] Repository cloné
- [ ] Dépendances installées
- [ ] Variables d'environnement configurées
- [ ] Base de données migrée
- [ ] Application buildée
- [ ] Service systemd configuré et démarré
- [ ] Backend accessible depuis l'extérieur
- [ ] Frontend connecté au backend
- [ ] Tests de validation passés
- [ ] Monitoring configuré
- [ ] Sécurité renforcée

---

## 📚 Ressources Utiles

- **Vultr Docs** : https://www.vultr.com/docs/
- **Node.js Docs** : https://nodejs.org/docs/
- **pnpm Docs** : https://pnpm.io/
- **Systemd Docs** : https://www.freedesktop.org/software/systemd/man/

---

**🚀 Votre application est maintenant déployée sur Vultr et prête pour le hackathon !**
