const authStatus = document.querySelector('#authStatus');
const custStatus = document.querySelector('#custStatus');

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
      });

      customersTbody.appendChild(tr);
    }

    // Keep current selection if present
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomer(customers[0]);
      await refreshContacts();
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

// Best-effort: check if already logged by calling /me
(async () => {
  try {
    await api('/auth/me');
    setStatus(authStatus, 'ok', 'Sessão ativa');
    setSelectedCustomer(null);
    await refreshCustomers();
  } catch {
    setStatus(authStatus, null, 'Não autenticado');
    setSelectedCustomer(null);
  }
})();
