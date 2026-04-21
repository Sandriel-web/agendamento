import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, getDocs, onSnapshot, query, orderBy, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Protege rota
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = 'admin.html';
});

// Logout
document.getElementById('btn-sair').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'admin.html';
});

// Navegação entre seções
const menuItens = document.querySelectorAll('.menu li[data-secao]');
const secoes = document.querySelectorAll('.secao');
menuItens.forEach(li => {
  li.addEventListener('click', () => {
    menuItens.forEach(x => x.classList.remove('ativo'));
    secoes.forEach(s => s.classList.remove('ativa'));
    li.classList.add('ativo');
    document.getElementById('sec-' + li.dataset.secao).classList.add('ativa');
  });
});

// ====== DASHBOARD (métricas + próximos) ======
function inicioDoDia(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function fimDoDia(d = new Date()) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

function carregarDashboard() {
  // Barbeiros e serviços
  onSnapshot(collection(db, 'barbeiros'), (snap) => {
    document.getElementById('m-barbeiros').textContent = snap.size;
  });
  onSnapshot(collection(db, 'servicos'), (snap) => {
    document.getElementById('m-servicos').textContent = snap.size;
  });

  // Agendamentos
  onSnapshot(collection(db, 'agendamentos'), (snap) => {
    const agora = new Date();
    const ini = inicioDoDia(agora);
    const fim = fimDoDia(agora);
    const fimSemana = new Date(ini); fimSemana.setDate(ini.getDate() + 7);

    let hoje = 0, semana = 0, faturamento = 0;
    const proximos = [];

    snap.forEach(doc => {
      const a = doc.data();
      if (a.status === 'cancelado') return;
      const data = a.dataHoraInicio.toDate();

      if (data >= ini && data <= fim) {
        hoje++;
        faturamento += Number(a.preco || 0);
      }
      if (data >= ini && data <= fimSemana) semana++;
      if (data >= agora) proximos.push({ id: doc.id, ...a, data });
    });

    document.getElementById('m-hoje').textContent = hoje;
    document.getElementById('m-semana').textContent = semana;
    document.getElementById('m-faturamento').textContent =
      'R$ ' + faturamento.toFixed(2).replace('.', ',');

    // Lista dos 5 próximos
    proximos.sort((a,b) => a.data - b.data);
    const listaEl = document.getElementById('lista-proximos');
    if (proximos.length === 0) {
      listaEl.innerHTML = '<div class="lista-item"><div class="info">Nenhum agendamento futuro</div></div>';
    } else {
      listaEl.innerHTML = proximos.slice(0, 5).map(p => `
        <div class="lista-item">
          <div class="info">
            <strong>${p.clienteNome}</strong> — ${p.servicoNome}
            <small>${formatarData(p.data)} • Barbeiro: ${p.barbeiroNome} • 📞 ${p.clienteTelefone}</small>
          </div>
          <span class="status-badge status-${p.status}">${p.status}</span>
        </div>
      `).join('');
    }
  });
}

function formatarData(d) {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

carregarDashboard();

// Exporta para uso em admin.js
window.formatarData = formatarData;
