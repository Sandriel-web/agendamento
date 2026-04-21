import { db } from './firebase-config.js';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  setDoc, getDoc, updateDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============ UTILITÁRIO: Redimensionar imagem e converter para base64 ============
function redimensionarImagem(file, maxSize = 400, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calcula proporção mantendo aspecto
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Converte para JPEG base64 (menor tamanho)
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============ BARBEIROS ============
const formBarbeiro = document.getElementById('form-barbeiro');
const listaBarbeiros = document.getElementById('lista-barbeiros');
const filtroBarbeiro = document.getElementById('filtro-barbeiro');

// Upload de foto
const inputFoto = document.getElementById('b-foto');
const btnEscolherFoto = document.getElementById('btn-escolher-foto');
const btnRemoverFoto = document.getElementById('btn-remover-foto');
const fotoPreview = document.getElementById('foto-preview');
const fotoImg = document.getElementById('foto-img');
const fotoPlaceholder = document.getElementById('foto-placeholder');

let fotoBase64 = null;

btnEscolherFoto.addEventListener('click', () => inputFoto.click());
fotoPreview.addEventListener('click', () => inputFoto.click());

inputFoto.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Selecione um arquivo de imagem válido.');
    return;
  }
  try {
    fotoBase64 = await redimensionarImagem(file, 400, 0.8);
    fotoImg.src = fotoBase64;
    fotoImg.style.display = 'block';
    fotoPlaceholder.style.display = 'none';
    btnRemoverFoto.style.display = 'inline-block';
  } catch (err) {
    alert('Erro ao processar imagem: ' + err.message);
  }
});

btnRemoverFoto.addEventListener('click', () => {
  fotoBase64 = null;
  inputFoto.value = '';
  fotoImg.src = '';
  fotoImg.style.display = 'none';
  fotoPlaceholder.style.display = 'block';
  btnRemoverFoto.style.display = 'none';
});

function resetFotoUpload() {
  fotoBase64 = null;
  inputFoto.value = '';
  fotoImg.src = '';
  fotoImg.style.display = 'none';
  fotoPlaceholder.style.display = 'block';
  btnRemoverFoto.style.display = 'none';
}

formBarbeiro.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('b-nome').value.trim();
  const telefone = document.getElementById('b-telefone').value.trim();
  if (!nome) return;
  try {
    const dados = {
      nome,
      telefone,
      ativo: true,
      criadoEm: new Date()
    };
    if (fotoBase64) dados.foto = fotoBase64;

    await addDoc(collection(db, 'barbeiros'), dados);
    formBarbeiro.reset();
    resetFotoUpload();
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
    : barbeiros.map(b => {
      const fotoHtml = b.foto
        ? `<img src="${b.foto}" class="mini-foto" alt="${b.nome}">`
        : `<div class="mini-foto-placeholder">${b.nome.charAt(0).toUpperCase()}</div>`;
      return `
        <div class="lista-item">
          <div class="info" style="display:flex;align-items:center;gap:12px;">
            ${fotoHtml}
            <div>
              <strong>${b.nome}</strong>
              <small>${b.telefone || 'Sem telefone'}</small>
            </div>
          </div>
          <div class="acoes">
            <button class="btn-small" onclick="trocarFotoBarbeiro('${b.id}')">${b.foto ? 'Trocar Foto' : 'Add Foto'}</button>
            ${b.foto ? `<button class="btn-small btn-danger" onclick="removerFotoBarbeiro('${b.id}')">Remover Foto</button>` : ''}
            <button class="btn-small btn-danger" onclick="excluirBarbeiro('${b.id}')">Excluir</button>
          </div>
        </div>
      `;
    }).join('');

  // Atualiza filtro da agenda
  filtroBarbeiro.innerHTML = '<option value="">Todos</option>' +
    barbeiros.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
});

window.excluirBarbeiro = async (id) => {
  if (!confirm('Excluir este barbeiro?')) return;
  await deleteDoc(doc(db, 'barbeiros', id));
};

// Trocar/adicionar foto de barbeiro já cadastrado
window.trocarFotoBarbeiro = (id) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await redimensionarImagem(file, 400, 0.8);
      await updateDoc(doc(db, 'barbeiros', id), { foto: base64 });
      alert('✓ Foto atualizada!');
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };
  input.click();
};

window.removerFotoBarbeiro = async (id) => {
  if (!confirm('Remover a foto deste barbeiro?')) return;
  await updateDoc(doc(db, 'barbeiros', id), { foto: null });
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
