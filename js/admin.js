import { db } from './firebase-config.js';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  setDoc, getDoc, updateDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============ BARBEIROS ============
const formBarbeiro = document.getElementById('form-barbeiro');
const listaBarbeiros = document.getElementById('lista-barbeiros');
const filtroBarbeiro = document.getElementById('filtro-barbeiro');

formBarbeiro.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('b-nome').value.trim();
  const telefone = document.getElementById('b-telefone').value.trim();
  if (!nome) return;
  try {
    await addDoc(collection(db, 'barbeiros'), {
      nome, telefone, ativo: true, criadoEm: new Date()
    });
    formBarbeiro.reset();
  } catch (err) {
    alert('Erro ao cadastrar: ' + err.message);
  }
});

onSnapshot(collection(db, 'barbeiros'), (snap) => {
  const barbeiros = [];
  snap.forEach(d => barbeiros.push({ id: d.id, ...d.data() }));
  barbeiros.sort((a,b) => a.nome.localeCompare(b.nome));

  listaBarbeiros.innerHTML = barbeiros.length === 0
    ? '<div class="lista-item"><div class="info">Nenhum barbeiro cadastrado</div></div>'
    : barbeiros.map(b => `
      <div class="lista-item">
        <div class="info">
          <strong>${b.nome}</strong>
          <small>${b.telefone || 'Sem telefone'}</small>
        </div>
        <div class="acoes">
          <button class="btn-small btn-danger" onclick="excluirBarbeiro('${b.id}')">Excluir</button>
        </div>
      </div>
    `).join('');

  // Atualiza filtro da agenda
  filtroBarbeiro.innerHTML = '<option value="">Todos</option>' +
    barbeiros.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
});

window.excluirBarbeiro = async (id) => {
  if (!confirm('Excluir este barbeiro?')) return;
  await deleteDoc(doc(db, 'barbeiros', id));
};

// ============ SERVIÇOS ============
const formServico = document.getElementById('form-servico');
const listaServicos = document.getElementById('lista-servicos');

formServico.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('s-nome').value.trim();
  const duracao = parseInt(document.getElementById('s-duracao').value);
  const preco = parseFloat(document.getElementById('s-preco').value);
  if (!nome || !duracao || isNaN(preco)) return;

  try {
    await addDoc(collection(db, 'servicos'), {
      nome, duracao, preco, ativo: true, criadoEm: new Date()
    });
    formServico.reset();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
});

onSnapshot(collection(db, 'servicos'), (snap) => {
  const servicos = [];
  snap.forEach(d => servicos.push({ id: d.id, ...d.data() }));
  servicos.sort((a,b) => a.nome.localeCompare(b.nome));

  listaServicos.innerHTML = servicos.length === 0
    ? '<div class="lista-item"><div class="info">Nenhum serviço cadastrado</div></div>'
    : servicos.map(s => `
      <div class="lista-item">
        <div class="info">
          <strong>${s.nome}</strong>
          <small>${s.duracao} min • R$ ${Number(s.preco).toFixed(2).replace('.', ',')}</small>
        </div>
        <div class="acoes">
          <button class="btn-small btn-danger" onclick="excluirServico('${s.id}')">Excluir</button>
        </div>
      </div>
    `).join('');
});

window.excluirServico = async (id) => {
  if (!confirm('Excluir este serviço?')) return;
  await deleteDoc(doc(db, 'servicos', id));
};

// ============ AGENDA (lista filtrada) ============
const filtroData = document.getElementById('filtro-data');
const listaAgenda = document.getElementById('lista-agenda');
filtroData.value = new Date().toISOString().split('T')[0];

let todosAgendamentos = [];

onSnapshot(collection(db, 'agendamentos'), (snap) => {
  todosAgendamentos = [];
  snap.forEach(d => todosAgendamentos.push({ id: d.id, ...d.data() }));
  renderAgenda();
});

filtroData.addEventListener('change', renderAgenda);
filtroBarbeiro.addEventListener('change', renderAgenda);

function renderAgenda() {
  const dataSel = filtroData.value;
  const barbSel = filtroBarbeiro.value;

  let filtrados = todosAgendamentos.filter(a => {
    const d = a.dataHoraInicio.toDate();
    const dataStr = d.toISOString().split('T')[0];
    if (dataSel && dataStr !== dataSel) return false;
    if (barbSel && a.barbeiroId !== barbSel) return false;
    return true;
  });

  filtrados.sort((a,b) => a.dataHoraInicio.toDate() - b.dataHoraInicio.toDate());

  listaAgenda.innerHTML = filtrados.length === 0
    ? '<div class="lista-item"><div class="info">Nenhum agendamento</div></div>'
    : filtrados.map(a => {
      const d = a.dataHoraInicio.toDate();
      const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="lista-item">
          <div class="info">
            <strong>${hora} — ${a.clienteNome}</strong>
            <small>${a.servicoNome} (${a.duracao}min • R$ ${Number(a.preco).toFixed(2).replace('.', ',')}) • Barbeiro: ${a.barbeiroNome} • 📞 ${a.clienteTelefone}</small>
          </div>
          <div class="acoes">
            <span class="status-badge status-${a.status}">${a.status}</span>
            ${a.status === 'confirmado' ? `
              <button class="btn-small" onclick="concluirAgendamento('${a.id}')">Concluir</button>
              <button class="btn-small btn-danger" onclick="cancelarAgendamento('${a.id}')">Cancelar</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
}

window.concluirAgendamento = async (id) => {
  await updateDoc(doc(db, 'agendamentos', id), { status: 'concluido' });
};
window.cancelarAgendamento = async (id) => {
  if (!confirm('Cancelar este agendamento? O horário ficará disponível novamente.')) return;
  await updateDoc(doc(db, 'agendamentos', id), { status: 'cancelado' });
};

// ============ CONFIGURAÇÕES ============
const formConfig = document.getElementById('form-config');
const configMsg = document.getElementById('config-msg');
const diasChips = document.querySelectorAll('.dia-chip');
let diasSelecionados = new Set();

diasChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const dia = parseInt(chip.dataset.dia);
    if (diasSelecionados.has(dia)) {
      diasSelecionados.delete(dia);
      chip.classList.remove('ativo');
    } else {
      diasSelecionados.add(dia);
      chip.classList.add('ativo');
    }
  });
});

// Carrega config atual
(async () => {
  const ref = doc(db, 'config', 'horarios');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const c = snap.data();
    (c.diasSemana || []).forEach(d => {
      diasSelecionados.add(d);
      document.querySelector(`.dia-chip[data-dia="${d}"]`)?.classList.add('ativo');
    });
    document.getElementById('hora-abertura').value = c.horaAbertura || '09:00';
    document.getElementById('hora-fechamento').value = c.horaFechamento || '19:00';
    document.getElementById('intervalo-inicio').value = c.intervaloInicio || '';
    document.getElementById('intervalo-fim').value = c.intervaloFim || '';
  } else {
    // Padrão inicial
    [1,2,3,4,5,6].forEach(d => {
      diasSelecionados.add(d);
      document.querySelector(`.dia-chip[data-dia="${d}"]`)?.classList.add('ativo');
    });
    document.getElementById('hora-abertura').value = '09:00';
    document.getElementById('hora-fechamento').value = '19:00';
  }
})();

formConfig.addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = {
    diasSemana: Array.from(diasSelecionados).sort(),
    horaAbertura: document.getElementById('hora-abertura').value,
    horaFechamento: document.getElementById('hora-fechamento').value,
    intervaloInicio: document.getElementById('intervalo-inicio').value || null,
    intervaloFim: document.getElementById('intervalo-fim').value || null,
    atualizadoEm: new Date()
  };
  try {
    await setDoc(doc(db, 'config', 'horarios'), dados);
    configMsg.textContent = '✓ Configurações salvas!';
    setTimeout(() => configMsg.textContent = '', 3000);
  } catch (err) {
    configMsg.style.color = '#ff6b7a';
    configMsg.textContent = 'Erro: ' + err.message;
  }
});
