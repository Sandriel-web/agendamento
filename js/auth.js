import { auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Se já estiver logado, vai direto ao dashboard
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = 'dashboard.html';
});

const form = document.getElementById('form-login');
const erroEl = document.getElementById('erro');
const btn = document.getElementById('btn-entrar');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erroEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    const msgs = {
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
      'auth/invalid-email': 'E-mail inválido.'
    };
    erroEl.textContent = msgs[err.code] || 'Erro ao entrar. Tente novamente.';
    btn.disabled = false;
    btn.textContent = 'ENTRAR';
  }
});
