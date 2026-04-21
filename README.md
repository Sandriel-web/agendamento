# ✂️ Sandriel Barbearia — Sistema de Agendamento

SaaS simples de agendamento online para a **Sandriel Barbearia**, com painel administrativo e página pública para clientes. Tempo real via **Firebase Firestore**.

## 🌐 Links

- **Cliente:** https://sandriel-web.github.io/agendamento/
- **Admin:** https://sandriel-web.github.io/agendamento/admin.html

## ⚙️ Tecnologias

- HTML5, CSS3, JavaScript (ES Modules)
- Firebase Authentication (email/senha)
- Firebase Firestore (banco em tempo real)
- GitHub Pages (hospedagem)

## 📁 Estrutura

```
agendamento/
├── index.html          # Página do cliente
├── admin.html          # Login do admin
├── dashboard.html      # Painel administrativo
├── assets/logosandriel.png
├── css/style.css
├── css/admin.css
└── js/
    ├── firebase-config.js
    ├── cliente.js
    ├── auth.js
    ├── dashboard.js
    └── admin.js
```

## 🔥 Configuração do Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/project/cliente-sandriel)
2. **Authentication** → Sign-in method → ativar **Email/senha**
3. **Authentication** → Users → criar usuário `sandriel@sandriel.com`
4. **Firestore Database** → Criar banco (região `southamerica-east1`)
5. **Firestore → Regras** → colar:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /barbeiros/{id} { allow read: if true; allow write: if request.auth != null; }
    match /servicos/{id} { allow read: if true; allow write: if request.auth != null; }
    match /agendamentos/{id} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if request.auth != null;
    }
    match /config/{id} { allow read: if true; allow write: if request.auth != null; }
  }
}
```

6. **Authentication → Settings → Authorized domains** → adicionar `sandriel-web.github.io`

## 🚀 Deploy no GitHub Pages

1. Envie todos os arquivos para o repositório
2. No GitHub: **Settings → Pages**
3. Source: `Deploy from branch` → `main` → `/ (root)` → Save
4. Aguarde 1-2 minutos e acesse a URL

## 📋 Primeiro uso (checklist)

1. Acesse `/admin.html` e entre com `sandriel@sandriel.com`
2. Vá em **Configurações** e defina horário de funcionamento
3. Cadastre os **barbeiros**
4. Cadastre os **serviços** (com duração em minutos)
5. Teste o agendamento em `/index.html`

## 💬 Suporte

Clientes cancelam via WhatsApp: **(64) 9626-0078**

---
© Sandriel Barbearia
