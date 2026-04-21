// ============================================
// Configuração do Firebase - Sandriel Barbearia
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxi-X7ytKyq5w_phAoybtMkSxM8v-fV_Y",
  authDomain: "cliente-sandriel.firebaseapp.com",
  projectId: "cliente-sandriel",
  storageBucket: "cliente-sandriel.firebasestorage.app",
  messagingSenderId: "572312677486",
  appId: "1:572312677486:web:b2c2b6ceeffd824f3c8a7f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
