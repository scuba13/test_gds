const authStatus = document.querySelector('#authStatus');
const custStatus = document.querySelector('#custStatus');

const dashboard = document.querySelector('#dashboard');
const refreshDashboardBtn = document.querySelector('#refreshDashboardBtn');
const dashboardStatus = document.querySelector('#dashboardStatus');

const emailEl = document.querySelector('#email');
const passwordEl = document.querySelector('#password');
const companyNameEl = document.querySelector('#companyName');

const registerBtn = document.querySelector('#registerBtn');
const loginBtn = document.querySelector('#loginBtn');
const logoutBtn = document.querySelector('#logoutBtn');

const customerForm = document.querySelector('#customerForm');
const createCustomerBtn = document.querySelector('#createCustomerBtn');
const refreshBtn = document.querySelector('#refreshBtn');

const customersTbody = document.querySelector('#customersTbody');

const selectedCustomerLabel = document.querySelector('#selectedCustomerLabel');
const contactsTbody = document.querySelector('#contactsTbody');
const contactStatus = document.querySelector('#contactStatus');

const contactForm = document.querySelector('#contactForm');
const createContactBtn = document.querySelector('#createContactBtn');
const refreshContactsBtn = document.querySelector('#refreshContactsBtn');

const oppForm = document.querySelector('#oppForm');
const createOppBtn = document.querySelector('#createOppBtn');
const refreshOppsBtn = document.querySelector('#refreshOppsBtn');
const oppStatus = document.querySelector('#oppStatus');
const kanban = document.querySelector('#kanban');

let selectedCustomerId = null;

function setStatus(el, type, text) {
  el.textContent = text;
  el.classList.remove('ok', 'err');
  if (type === 'ok') el.classList.add('ok');
  if (type === 'err') el.classList.add('err');
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    // cookie HttpOnly -> browser manages it; fetch still needs credentials on cross-origin.
    // Here we call same-origin (/api proxy), so credentials isn't necessary, but safe.
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const msg = typeof data === 'string' ? data : data?.message || data?.error;
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return data;
}

function setSelectedCustomer(customer) {
  selectedCustomerId = customer?.id ?? null;
  selectedCustomerLabel.textContent = selectedCustomerId
    ? `${customer.name} (${customer.id})`
    : 'nenhum';

  // Reset contact UI
  contactsTbody.innerHTML = '';
  setStatus(contactStatus, null, '');
}

async function refreshContacts() {
  if (!selectedCustomerId) {
    setStatus(contactStatus, 'err', 'Selecione um cliente primeiro');
    return;
  }

  try {
    setStatus(contactStatus, null, 'Carregando...');
    const contacts = await api(`/customers/${selectedCustomerId}/contacts`);

    contactsTbody.innerHTML = '';
    for (const c of contacts) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(c.name ?? '')}</td>
        <td>${escapeHtml(c.email ?? '')}</td>
        <td>${escapeHtml(c.phone ?? '')}</td>
        <td class="muted"><code>${escapeHtml(c.id ?? '')}</code></td>
      `;
      contactsTbody.appendChild(tr);
    }

    setStatus(contactStatus, 'ok', `${contacts.length} contato(s)`);
  } catch (err) {
    setStatus(contactStatus, 'err', err.message);
  }
}

const STAGES = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

function formatAmount(value) {
  if (value === null || value === undefined || value === '') return '';

  // Prisma Decimal can arrive as string/number/object depending on serialization.
  if (typeof value === 'object') {
    try {
      // e.g. Decimal.js: { d: ..., e: ... } or similar; best-effort.
      value = value.toString?.() ?? String(value);
    } catch {
      value = String(value);
    }
  }

  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function renderDashboard(summary) {
  const items = [
    ['Clientes', summary.totalCustomers],
    ['Contatos', summary.totalContacts],
    ['Oportunidades', summary.totalOpportunities],
    ['Abertas', summary.openOpportunities],
    ['Ganhas', summary.wonOpportunities],
    ['Perdidas', summary.lostOpportunities],
    ['Pipeline aberto', `R$ ${formatAmount(summary.openPipelineAmount)}`],
  ];

  dashboard.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'stats';

  for (const [label, value] of items) {
    const el = document.createElement('div');
    el.className = 'stat';
    el.innerHTML = `
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value)}</div>
    `;
    grid.appendChild(el);
  }

  dashboard.appendChild(grid);
}

async function refreshDashboard() {
  try {
    setStatus(dashboardStatus, null, 'Carregando...');
    const summary = await api('/metrics/summary');
    renderDashboard(summary);
    setStatus(dashboardStatus, 'ok', 'ok');
  } catch (err) {
    setStatus(dashboardStatus, 'err', err.message);
  }
}

function buildKanbanColumn(stage) {
  const col = document.createElement('section');
  col.className = 'kanban-col';

  const title = document.createElement('h3');
  title.textContent = stage;

  const drop = document.createElement('div');
  drop.className = 'kanban-drop';
  drop.dataset.stage = stage;

  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('drop-active');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('drop-active'));
  drop.addEventListener('drop', async (e) => {
    e.preventDefault();
    drop.classList.remove('drop-active');

    const oppId =
      e.dataTransfer?.getData('text/opportunity-id') ||
      e.dataTransfer?.getData('text/plain');
    if (!oppId) return;

    try {
      setStatus(oppStatus, null, 'Movendo...');
      await api(`/opportunities/${oppId}/move`, {
        method: 'POST',
        body: { toStage: stage },
      });
      await refreshOpportunities();
    } catch (err) {
      setStatus(oppStatus, 'err', err.message);
    }
  });

  col.appendChild(title);
  col.appendChild(drop);
  return { col, drop };
}

function renderKanban(opps) {
  kanban.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'kanban';

  const cols = new Map();
  for (const stage of STAGES) {
    const { col, drop } = buildKanbanColumn(stage);
    cols.set(stage, drop);
    grid.appendChild(col);
  }

  for (const o of opps) {
    const card = document.createElement('div');
    card.className = 'card-item';
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/opportunity-id', o.id);
      e.dataTransfer?.setData('text/plain', o.id);
    });

    // Improve cross-browser DnD: ensure we always attach the id.
    card.dataset.opportunityId = o.id;

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = o.title;

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.innerHTML = `
      <span>${escapeHtml(o.stage)}</span>
      <span>R$ ${escapeHtml(formatAmount(o.amount))}</span>
    `;

    card.appendChild(title);
    card.appendChild(meta);

    const target = cols.get(o.stage) ?? cols.get('NEW');
    target.appendChild(card);
  }

  kanban.appendChild(grid);
}

async function refreshOpportunities() {
  if (!selectedCustomerId) {
    setStatus(oppStatus, 'err', 'Selecione um cliente primeiro');
    return;
  }

  try {
    setStatus(oppStatus, null, 'Carregando...');
    const opps = await api('/opportunities');

    const filtered = opps.filter((o) => o.customerId === selectedCustomerId);
    renderKanban(filtered);

    setStatus(oppStatus, 'ok', `${filtered.length} oportunidade(s)`);
  } catch (err) {
    setStatus(oppStatus, 'err', err.message);
  }
}

async function refreshCustomers() {
  try {
    setStatus(custStatus, null, 'Carregando...');
    const customers = await api('/customers');

    customersTbody.innerHTML = '';
    for (const c of customers) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(c.name ?? '')}</td>
        <td>${escapeHtml(c.email ?? '')}</td>
        <td>${escapeHtml(c.phone ?? '')}</td>
        <td class="muted"><code>${escapeHtml(c.id ?? '')}</code></td>
        <td><button type="button" data-select-customer="${escapeHtml(c.id ?? '')}">Selecionar</button></td>
      `;

      const btn = tr.querySelector('button[data-select-customer]');
      btn.addEventListener('click', async () => {
        setSelectedCustomer(c);
        await refreshContacts();
        await refreshOpportunities();
      });

      customersTbody.appendChild(tr);
    }

    // Keep current selection if present
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomer(customers[0]);
      await refreshContacts();
      await refreshOpportunities();
    }

    setStatus(custStatus, 'ok', `${customers.length} cliente(s)`);
  } catch (err) {
    setStatus(custStatus, 'err', err.message);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

registerBtn.addEventListener('click', async () => {
  try {
    setStatus(authStatus, null, 'Cadastrando...');
    await api('/auth/register', {
      method: 'POST',
      body: {
        email: emailEl.value,
        password: passwordEl.value,
        companyName: companyNameEl.value || 'Minha Empresa',
      },
    });
    setStatus(authStatus, 'ok', 'Cadastrado e logado (cookie emitido)');
    setSelectedCustomer(null);
    await refreshCustomers();
    await refreshDashboard();
  } catch (err) {
    setStatus(authStatus, 'err', err.message);
  }
});

loginBtn.addEventListener('click', async () => {
  try {
    setStatus(authStatus, null, 'Logando...');
    await api('/auth/login', {
      method: 'POST',
      body: { email: emailEl.value, password: passwordEl.value },
    });
    setStatus(authStatus, 'ok', 'Logado (cookie emitido)');
    setSelectedCustomer(null);
    await refreshCustomers();
    await refreshDashboard();
  } catch (err) {
    setStatus(authStatus, 'err', err.message);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    setStatus(authStatus, null, 'Saindo...');
    await api('/auth/logout', { method: 'POST' });
    setStatus(authStatus, 'ok', 'Logout ok');
    customersTbody.innerHTML = '';
    setSelectedCustomer(null);
    dashboard.innerHTML = '';
    setStatus(dashboardStatus, null, '');
    setStatus(custStatus, null, '');
  } catch (err) {
    setStatus(authStatus, 'err', err.message);
  }
});

customerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    createCustomerBtn.disabled = true;
    setStatus(custStatus, null, 'Criando...');

    const fd = new FormData(customerForm);
    const body = {
      name: fd.get('name'),
      email: fd.get('email') || undefined,
      phone: fd.get('phone') || undefined,
    };

    await api('/customers', { method: 'POST', body });
    setStatus(custStatus, 'ok', 'Cliente criado');
    customerForm.reset();
    setSelectedCustomer(null);
    await refreshCustomers();
  } catch (err) {
    setStatus(custStatus, 'err', err.message);
  } finally {
    createCustomerBtn.disabled = false;
  }
});

refreshBtn.addEventListener('click', refreshCustomers);
refreshDashboardBtn.addEventListener('click', refreshDashboard);

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!selectedCustomerId) {
    setStatus(contactStatus, 'err', 'Selecione um cliente primeiro');
    return;
  }

  try {
    createContactBtn.disabled = true;
    setStatus(contactStatus, null, 'Criando...');

    const fd = new FormData(contactForm);
    const body = {
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone') || undefined,
    };

    await api(`/customers/${selectedCustomerId}/contacts`, {
      method: 'POST',
      body,
    });

    setStatus(contactStatus, 'ok', 'Contato criado');
    contactForm.reset();
    await refreshContacts();
  } catch (err) {
    setStatus(contactStatus, 'err', err.message);
  } finally {
    createContactBtn.disabled = false;
  }
});

refreshContactsBtn.addEventListener('click', refreshContacts);

oppForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!selectedCustomerId) {
    setStatus(oppStatus, 'err', 'Selecione um cliente primeiro');
    return;
  }

  try {
    createOppBtn.disabled = true;
    setStatus(oppStatus, null, 'Criando...');

    const fd = new FormData(oppForm);
    const body = {
      customerId: selectedCustomerId,
      title: fd.get('title'),
      amount: Number(fd.get('amount')),
      stage: String(fd.get('stage') || '').trim().toUpperCase(),
      expectedCloseDate: fd.get('expectedCloseDate') || undefined,
    };

    await api('/opportunities', { method: 'POST', body });

    setStatus(oppStatus, 'ok', 'Oportunidade criada');
    oppForm.reset();
    await refreshOpportunities();
  } catch (err) {
    setStatus(oppStatus, 'err', err.message);
  } finally {
    createOppBtn.disabled = false;
  }
});

refreshOppsBtn.addEventListener('click', refreshOpportunities);

// Best-effort: check if already logged by calling /me
(async () => {
  try {
    await api('/auth/me');
    setStatus(authStatus, 'ok', 'Sessão ativa');
    setSelectedCustomer(null);
    await refreshCustomers();
    await refreshDashboard();
    await refreshOpportunities();
  } catch {
    setStatus(authStatus, null, 'Não autenticado');
    setSelectedCustomer(null);
  }
})();
