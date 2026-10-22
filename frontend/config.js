const API = `http://${location.hostname}:3000/api`;

async function api(path, method = 'GET', body) {
  const res = await fetch(API + path, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Prevents user-typed text from being run as HTML
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Small inline icon set (stroke icons, inherit text color)
const ICONS = {
  board: '<path d="M3 4h18M5 4v10h14V4M12 14v4M8 21l4-3 4 3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  out: '<path d="M7 17L17 7M8 7h9v9"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>'
};
function ico(name) {
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

// Call at the start of every page: checks login, draws the nav bar
async function initPage() {
  let user;
  try {
    user = await api('/me');
  } catch {
    location.href = 'login.html';
    return null;
  }
  const page = location.pathname.split('/').pop() || 'schedule.html';
  const link = (href, label) =>
    `<a href="${href}" class="${page === href ? 'active' : ''}">${label}</a>`;
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('nav').innerHTML = `
    <div class="nav-inner">
      <div class="brand">
        <strong>Room Scheduling</strong>
        <span>Bulacan State University - Meneses Campus</span>
      </div>
      <nav class="links">
        ${link('schedule.html', 'Rooms')}
        ${link('requests.html', 'Requests')}
      </nav>
      <div class="who">
        <span class="avatar">${esc(initials)}</span>
        <div class="who-text"><strong>${esc(user.name)}</strong><span>${esc(user.role)}</span></div>
        <button class="btn btn-quiet" onclick="logout()">Log out</button>
      </div>
    </div>`;
  return user;
}

async function logout() {
  await api('/logout', 'POST');
  location.href = 'login.html';
}
