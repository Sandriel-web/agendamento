import { db } from './firebase-config.js';
import {
  collection, getDocs, addDoc, query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// === ESTADO ===
const estado = {
  profissional: null,
  servico: null,
  dia: null,
  horario: null
};

// === ELEMENTOS ===
const elProfissionais = document.getElementById('lista-profissionais');
const elServicos = document.getElementById('lista-servicos');
const elDias = document.getElementById('lista-dias');
const elHorarios = document.getElementById('lista-horarios');
const elForm = document.getElementById('form-agendamento');
const elMensagem = document.getElementById('mensagem');

// === INIT ===
carregarProfissionais();
carregarServicos();
gerarDias();

// === PROFISSIONAIS (coleção: barbeiros) ===
async function carregarProfissionais() {
  try {
    const snap = await getDocs(collection(db, 'barbeiros'));
    if (snap.empty) {
      elProfissionais.innerHTML = '<p class="carregando">Nenhum profissional cadastrado.</p>';
      return;
    }
    elProfissionais.innerHTML = '';
    snap.forEach(doc => {
      const p = { id: doc.id, ...doc.data() };
      if (p.ativo === false) return; // ignora inativos

      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = p.id;

      const avatar = p.foto
        ? `<img src="${p.foto}" alt="${p.nome}" class="avatar" />`
        : `<div class="avatar-placeholder">${(p.nome || '?')[0].toUpperCase()}</div>`;

      card.innerHTML = `${avatar}<div class="nome">${p.nome}</div>`;
      card.addEventListener('click', () => selecionarProfissional(p, card));
      elProfissionais.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    elProfissionais.innerHTML = '<p class="carregando">Erro ao carregar profissionais.</p>';
  }
}

function selecionarProfissional(p, card) {
  estado.profissional = p;
  document.querySelectorAll('#lista-profissionais .card').forEach(c => c.classList.remove('selecionado'));
  card.classList.add('selecionado');
  atualizarHorarios();
}

// === SERVIÇOS ===
async function carregarServicos() {
  try {
    const snap = await getDocs(collection(db, 'servicos'));
    if (snap.empty) {
      elServicos.innerHTML = '<p class="carregando">Nenhum serviço cadastrado.</p>';
      return;
    }
    elServicos.innerHTML = '';
    snap.forEach(doc => {
      const s = { id: doc.id, ...doc.data() };
      if (s.ativo === false) return;

      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = s.id;
      card.innerHTML = `
        <div class="avatar-placeholder">✂️</div>
        <div class="nome">${s.nome}</div>
        <div class="preco">R$ ${Number(s.preco || 0).toFixed(2)}</div>
      `;
      card.addEventListener('click', () => selecionarServico(s, card));
      elServicos.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    elServicos.innerHTML = '<p class="carregando">Erro ao carregar serviços.</p>';
  }
}

function selecionarServico(s, card) {
  estado.servico = s;
  document.querySelectorAll('#lista-servicos .card').forEach(c => c.classList.remove('selecionado'));
  card.classList.add('selecionado');
  atualizarHorarios();
}

// === DIAS (30 dias à frente) ===
function gerarDias() {
  const nomesDias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  elDias.innerHTML = '';

  for (let i = 0; i < 30; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);

    const card = document.createElement('div');
    card.className = 'card-dia';
    card.dataset.data = data.toISOString().split('T')[0];
    card.innerHTML = `
      <div class="dia-semana">${i === 0 ? 'HOJE' : nomesDias[data.getDay()]}</div>
      <div class="dia-numero">${String(data.getDate()).padStart(2, '0')}</div>
    `;
    card.addEventListener('click', () => selecionarDia(data, card));
    elDias.appendChild(card);
  }
}

function selecionarDia(data, card) {
  estado.dia = data;
  document.querySelectorAll('.card-dia').forEach(c => c.classList.remove('selecionado'));
  card.classList.add('selecionado');
  atualizarHorarios();
}

// === HORÁRIOS ===
async function atualizarHorarios() {
  if (!estado.profissional || !estado.dia) {
    elHorarios.innerHTML = '<p class="info-horario">Selecione um profissional e um dia.</p>';
    return;
  }

  elHorarios.innerHTML = '<p class="info-horario">Carregando horários...</p>';

  // Horários padrão (depois dá pra ler do doc config/horarios se quiser)
  const horariosPadrao = [
    '09:00', '10:00', '11:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00'
  ];

  const inicioDia = new Date(estado.dia);
  inicioDia.setHours(0, 0, 0, 0);
  const fimDia = new Date(estado.dia);
  fimDia.setHours(23, 59, 59, 999);

  try {
    // ⚠️ CORRIGIDO: usa barbeiroId e dataHoraInicio (mesmo padrão do admin)
    const q = query(
      collection(db, 'agendamentos'),
      where('barbeiroId', '==', estado.profissional.id),
      where('dataHoraInicio', '>=', Timestamp.fromDate(inicioDia)),
      where('dataHoraInicio', '<=', Timestamp.fromDate(fimDia))
    );
    const snap = await getDocs(q);
    const ocupados = new Set();
    snap.forEach(doc => {
      const ag = doc.data();
      if (ag.status === 'cancelado') return; // horário cancelado fica livre
      const d = ag.dataHoraInicio.toDate();
      ocupados.add(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
    });

    const agora = new Date();
    elHorarios.innerHTML = '';
    horariosPadrao.forEach(hora => {
      const btn = document.createElement('button');
      btn.className = 'btn-horario';
      btn.textContent = hora;
      btn.type = 'button';

      const [h, m] = hora.split(':').map(Number);
      const dataHorario = new Date(estado.dia);
      dataHorario.setHours(h, m, 0, 0);

      const ocupado = ocupados.has(hora);
      const passou = dataHorario < agora;

      if (ocupado || passou) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => selecionarHorario(hora, btn));
      }
      elHorarios.appendChild(btn);
    });
  } catch (e) {
    console.error(e);
    elHorarios.innerHTML = '<p class="info-horario">Erro ao carregar horários.</p>';
  }
}

function selecionarHorario(hora, btn) {
  estado.horario = hora;
  document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('selecionado'));
  btn.classList.add('selecionado');
}

// === ENVIO ===
elForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('nome').value.trim();
  const telefone = document.getElementById('telefone').value.trim();

  if (!estado.profissional) return mostrarMsg('Selecione um profissional.', 'erro');
  if (!estado.servico) return mostrarMsg('Selecione um serviço.', 'erro');
  if (!estado.dia) return mostrarMsg('Selecione um dia.', 'erro');
  if (!estado.horario) return mostrarMsg('Selecione um horário.', 'erro');
  if (!nome || !telefone) return mostrarMsg('Preencha seus dados.', 'erro');

  const [h, m] = estado.horario.split(':').map(Number);
  const dataHoraInicio = new Date(estado.dia);
  dataHoraInicio.setHours(h, m, 0, 0);

  const duracao = Number(estado.servico.duracao) || 30;
  const dataHoraFim = new Date(dataHoraInicio.getTime() + duracao * 60000);

  const btn = elForm.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    // ⚠️ CORRIGIDO: mesma estrutura que o admin.js espera
    await addDoc(collection(db, 'agendamentos'), {
      clienteNome: nome,
      clienteTelefone: telefone,
      barbeiroId: estado.profissional.id,
      barbeiroNome: estado.profissional.nome,
      servicoId: estado.servico.id,
      servicoNome: estado.servico.nome,
      preco: Number(estado.servico.preco) || 0,
      duracao: duracao,
      dataHoraInicio: Timestamp.fromDate(dataHoraInicio),
      dataHoraFim: Timestamp.fromDate(dataHoraFim),
      status: 'confirmado',
      criadoEm: Timestamp.now()
    });
    mostrarMsg('✅ Agendamento confirmado! Em breve entraremos em contato.', 'sucesso');
    elForm.reset();
    estado.horario = null;
    atualizarHorarios();
  } catch (e) {
    console.error(e);
    mostrarMsg('Erro ao agendar. Tente novamente.', 'erro');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirmar Agendamento';
  }
});

function mostrarMsg(texto, tipo) {
  elMensagem.textContent = texto;
  elMensagem.className = `mensagem ${tipo}`;
  if (tipo === 'sucesso') {
    setTimeout(() => { elMensagem.className = 'mensagem'; }, 5000);
  }
}
