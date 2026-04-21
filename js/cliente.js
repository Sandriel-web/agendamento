import { db } from './firebase-config.js';
import {
  collection, addDoc, onSnapshot, getDoc, doc, Timestamp, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Estado
let servicos = [];
let barbeiros = [];
let config = null;
let agendamentosDoDia = []; // do barbeiro + data selecionados
let horarioSelecionado = null;

// Elementos
const elNome = document.getElementById('nome');
const elTel = document.getElementById('telefone');
const selServico = document.getElementById('servico');
const selBarbeiro = document.getElementById('barbeiro');
const elData = document.getElementById('data');
const gridHorarios = document.getElementById('horarios');
const elResumo = document.getElementById('resumo');
const btnAgendar = document.getElementById('btn-agendar');
const elMsg = document.getElementById('mensagem');

// Data mínima = hoje
elData.min = new Date().toISOString().split('T')[0];
elData.value = new Date().toISOString().split('T')[0];

// Máscara de telefone
elTel.addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  e.target.value = v;
});

// Carrega serviços
onSnapshot(collection(db, 'servicos'), (snap) => {
  servicos = [];
  snap.forEach(d => servicos.push({ id: d.id, ...d.data() }));
  servicos.sort((a,b) => a.nome.localeCompare(b.nome));

  selServico.innerHTML = '<option value="">Selecione...</option>' +
    servicos.map(s => `<option value="${s.id}">${s.nome} — ${s.duracao}min — R$ ${Number(s.preco).toFixed(2).replace('.', ',')}</option>`).join('');
});

// Carrega barbeiros
onSnapshot(collection(db, 'barbeiros'), (snap) => {
  barbeiros = [];
  snap.forEach(d => barbeiros.push({ id: d.id, ...d.data() }));
  barbeiros.sort((a,b) => a.nome.localeCompare(b.nome));

  selBarbeiro.innerHTML = '<option value="">Selecione...</option>' +
    barbeiros.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
});

// Carrega config
(async () => {
  const snap = await getDoc(doc(db, 'config', 'horarios'));
  if (snap.exists()) config = snap.data();
  else config = { diasSemana: [1,2,3,4,5,6], horaAbertura: '09:00', horaFechamento: '19:00' };
  renderHorarios();
})();

// Eventos
[selServico, selBarbeiro, elData].forEach(el => el.addEventListener('change', () => {
  horarioSelecionado = null;
  escutarAgendamentos();
}));

// Escuta agendamentos em tempo real para aquele barbeiro+data
let unsubAgendamentos = null;
function escutarAgendamentos() {
  if (unsubAgendamentos) unsubAgendamentos();

  const barbId = selBarbeiro.value;
  const dataStr = elData.value;
  if (!barbId || !dataStr) {
    agendamentosDoDia = [];
    renderHorarios();
    return;
  }

  const ini = new Date(dataStr + 'T00:00:00');
  const fim = new Date(dataStr + 'T23:59:59');

  const q = query(
    collection(db, 'agendamentos'),
    where('barbeiroId', '==', barbId),
    where('dataHoraInicio', '>=', Timestamp.fromDate(ini)),
    where('dataHoraInicio', '<=', Timestamp.fromDate(fim))
  );

  unsubAgendamentos = onSnapshot(q, (snap) => {
    agendamentosDoDia = [];
    snap.forEach(d => agendamentosDoDia.push({ id: d.id, ...d.data() }));
    renderHorarios();
    atualizarResumo();
  });
}

// Gera e renderiza slots
function renderHorarios() {
  if (!config) return;
  const servId = selServico.value;
  const barbId = selBarbeiro.value;
  const dataStr = elData.value;

  if (!servId || !barbId || !dataStr) {
    gridHorarios.innerHTML = '<p style="grid-column:1/-1;color:#aaa;">Escolha serviço, barbeiro e data.</p>';
    return;
  }

  const servico = servicos.find(s => s.id === servId);
  if (!servico) return;

  const data = new Date(dataStr + 'T00:00:00');
  const diaSemana = data.getDay();

  if (!config.diasSemana.includes(diaSemana)) {
    gridHorarios.innerHTML = '<p style="grid-column:1/-1;color:#ff6b7a;">Barbearia fechada neste dia.</p>';
    return;
  }

  const slots = gerarSlots(data, servico.duracao);
  if (slots.length === 0) {
    gridHorarios.innerHTML = '<p style="grid-column:1/-1;color:#ff6b7a;">Sem horários disponíveis.</p>';
    return;
  }

  const agora = new Date();
  gridHorarios.innerHTML = slots.map(slot => {
    const ocupado = estaOcupado(slot, servico.duracao);
    const passou = slot < agora;
    const disabled = ocupado || passou;
    const cls = disabled ? 'horario-slot ocupado' : 'horario-slot';
    const label = slot.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const iso = slot.toISOString();
    const sel = horarioSelecionado === iso ? ' selecionado' : '';
    return `<div class="${cls}${sel}" data-iso="${iso}" ${disabled ? 'data-disabled="1"' : ''}>${label}</div>`;
  }).join('');

  // Clique nos slots
  gridHorarios.querySelectorAll('.horario-slot').forEach(el => {
    if (el.dataset.disabled) return;
    el.addEventListener('click', () => {
      horarioSelecionado = el.dataset.iso;
      gridHorarios.querySelectorAll('.horario-slot').forEach(x => x.classList.remove('selecionado'));
      el.classList.add('selecionado');
      atualizarResumo();
    });
  });
}

function gerarSlots(data, duracao) {
  const slots = [];
  const [hA, mA] = config.horaAbertura.split(':').map(Number);
  const [hF, mF] = config.horaFechamento.split(':').map(Number);
  const abre = new Date(data); abre.setHours(hA, mA, 0, 0);
  const fecha = new Date(data); fecha.setHours(hF, mF, 0, 0);

  let intIni = null, intFim = null;
  if (config.intervaloInicio && config.intervaloFim) {
    const [hi, mi] = config.intervaloInicio.split(':').map(Number);
    const [hf2, mf2] = config.intervaloFim.split(':').map(Number);
    intIni = new Date(data); intIni.setHours(hi, mi, 0, 0);
    intFim = new Date(data); intFim.setHours(hf2, mf2, 0, 0);
  }

  let atual = new Date(abre);
  while (atual.getTime() + duracao*60000 <= fecha.getTime()) {
    const fimSlot = new Date(atual.getTime() + duracao*60000);
    // Não inclui slots que invadem o intervalo
    const invadeIntervalo = intIni && intFim && atual < intFim && fimSlot > intIni;
    if (!invadeIntervalo) slots.push(new Date(atual));
    atual = new Date(atual.getTime() + duracao*60000);
  }
  return slots;
}

function estaOcupado(slot, duracao) {
  const inicio = slot.getTime();
  const fim = inicio + duracao*60000;
  return agendamentosDoDia.some(a => {
    if (a.status === 'cancelado') return false;
    const aIni = a.dataHoraInicio.toDate().getTime();
    const aFim = a.dataHoraFim.toDate().getTime();
    return inicio < aFim && fim > aIni; // overlap
  });
}

function atualizarResumo() {
  const nome = elNome.value.trim();
  const tel = elTel.value.trim();
  const servico = servicos.find(s => s.id === selServico.value);
  const barbeiro = barbeiros.find(b => b.id === selBarbeiro.value);

  if (!nome || !tel || !servico || !barbeiro || !horarioSelecionado) {
    elResumo.innerHTML = 'Complete os dados acima.';
    btnAgendar.disabled = true;
    return;
  }

  const dt = new Date(horarioSelecionado);
  elResumo.innerHTML = `
    <strong style="color:var(--dourado);">Resumo do agendamento</strong><br>
    👤 ${nome}<br>
    ✂️ ${servico.nome} — R$ ${Number(servico.preco).toFixed(2).replace('.', ',')}<br>
    💈 Barbeiro: ${barbeiro.nome}<br>
    📅 ${dt.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
  `;
  btnAgendar.disabled = false;
}

[elNome, elTel].forEach(el => el.addEventListener('input', atualizarResumo));

// Confirma agendamento
btnAgendar.addEventListener('click', async () => {
  const nome = elNome.value.trim();
  const tel = elTel.value.trim();
  const servico = servicos.find(s => s.id === selServico.value);
  const barbeiro = barbeiros.find(b => b.id === selBarbeiro.value);

  if (!nome || !tel || !servico || !barbeiro || !horarioSelecionado) return;

  btnAgendar.disabled = true;
  btnAgendar.textContent = 'Agendando...';
  elMsg.innerHTML = '';

  const inicio = new Date(horarioSelecionado);
  const fim = new Date(inicio.getTime() + servico.duracao*60000);

  // Recheca conflito (proteção extra contra corrida)
  if (estaOcupado(inicio, servico.duracao)) {
    elMsg.innerHTML = '<div class="mensagem erro">Ops! Esse horário acabou de ser reservado. Escolha outro.</div>';
    btnAgendar.textContent = 'CONFIRMAR AGENDAMENTO';
    btnAgendar.disabled = false;
    horarioSelecionado = null;
    renderHorarios();
    return;
  }

  try {
    await addDoc(collection(db, 'agendamentos'), {
      clienteNome: nome,
      clienteTelefone: tel,
      barbeiroId: barbeiro.id,
      barbeiroNome: barbeiro.nome,
      servicoId: servico.id,
      servicoNome: servico.nome,
      duracao: servico.duracao,
      preco: servico.preco,
      dataHoraInicio: Timestamp.fromDate(inicio),
      dataHoraFim: Timestamp.fromDate(fim),
      status: 'confirmado',
      criadoEm: Timestamp.now()
    });

    elMsg.innerHTML = `<div class="mensagem sucesso">✓ Agendamento confirmado para ${inicio.toLocaleString('pt-BR')}!</div>`;
    elNome.value = '';
    elTel.value = '';
    horarioSelecionado = null;
    btnAgendar.textContent = 'CONFIRMAR AGENDAMENTO';
    atualizarResumo();
  } catch (err) {
    console.error(err);
    elMsg.innerHTML = '<div class="mensagem erro">Erro ao agendar: ' + err.message + '</div>';
    btnAgendar.textContent = 'CONFIRMAR AGENDAMENTO';
    btnAgendar.disabled = false;
  }
});
