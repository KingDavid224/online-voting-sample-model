/* ── VoteBox Frontend App ──────────────────────── */
const API = '/api';
let currentUser = null;
let currentToken = null;

/* ── Init ──────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('votebox_user');
  if (saved) {
    const { user, token } = JSON.parse(saved);
    currentUser = user;
    currentToken = token;
    updateNavForUser();
  }
  showSection('home');
  fetchStats();
});

/* ── Toast ─────────────────────────────────────── */
const toastEl = document.createElement('div');
toastEl.id = 'toast';
document.body.appendChild(toastEl);

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 3000);
}

/* ── Navigation ────────────────────────────────── */
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(name);
  if (el) el.classList.add('active');

  if (name === 'polls') loadPolls();
  if (name === 'results') loadResults();
  if (name === 'admin') loadAdminPolls();
}

function updateNavForUser() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userDisplay = document.getElementById('userDisplay');
  const adminLink = document.getElementById('adminNavLink');

  if (currentUser) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    userDisplay.textContent = `👤 ${currentUser.name}`;
    if (currentUser.isAdmin) adminLink.style.display = 'inline';
  } else {
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    userDisplay.textContent = '';
    adminLink.style.display = 'none';
  }
}

function logout() {
  currentUser = null;
  currentToken = null;
  localStorage.removeItem('votebox_user');
  updateNavForUser();
  showSection('home');
  toast('Logged out successfully');
}

/* ── Auth ──────────────────────────────────────── */
async function register() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const msg = document.getElementById('regMsg');

  if (!name || !email || !password) return setMsg(msg, 'All fields required', 'error');

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) return setMsg(msg, data.message || 'Registration failed', 'error');
    setMsg(msg, 'Account created! Please login.', 'success');
    setTimeout(() => showSection('login'), 1500);
  } catch {
    setMsg(msg, 'Cannot reach server. Is it running?', 'error');
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMsg');

  if (!email || !password) return setMsg(msg, 'All fields required', 'error');

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return setMsg(msg, data.message || 'Login failed', 'error');

    currentUser = data.user;
    currentToken = data.token;
    localStorage.setItem('votebox_user', JSON.stringify({ user: currentUser, token: currentToken }));
    updateNavForUser();
    setMsg(msg, `Welcome back, ${currentUser.name}!`, 'success');
    setTimeout(() => showSection('polls'), 1200);
  } catch {
    setMsg(msg, 'Cannot reach server. Is it running?', 'error');
  }
}

/* ── Stats ─────────────────────────────────────── */
async function fetchStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const data = await res.json();
    animateCount('statPolls', data.polls || 0);
    animateCount('statVotes', data.votes || 0);
    animateCount('statUsers', data.users || 0);
  } catch { /* silently fail */ }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString();
    if (current >= target) clearInterval(timer);
  }, 30);
}

/* ── Polls ─────────────────────────────────────── */
async function loadPolls() {
  const grid = document.getElementById('pollsGrid');
  grid.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const res = await fetch(`${API}/polls`);
    const polls = await res.json();

    if (!polls.length) {
      grid.innerHTML = '<div class="empty-state"><div class="emoji">🗳️</div><p>No polls yet. Check back soon!</p></div>';
      return;
    }

    grid.innerHTML = polls.map(p => {
      const total = p.options.reduce((a, o) => a + o.votes, 0);
      const status = p.isActive ? 'Active' : 'Closed';
      const badgeClass = p.isActive ? '' : 'closed';
      return `
        <div class="poll-card" onclick="openVote('${p._id}')">
          <div class="poll-card-badge ${badgeClass}">${status}</div>
          <h3>${escHtml(p.question)}</h3>
          <div class="poll-card-meta">
            <span>${p.options.length} options</span>
            <span>${total} vote${total !== 1 ? 's' : ''}</span>
          </div>
        </div>`;
    }).join('');
  } catch {
    grid.innerHTML = '<div class="empty-state"><div class="emoji">⚠️</div><p>Could not load polls. Is the server running?</p></div>';
  }
}

async function openVote(pollId) {
  showSection('vote');
  const content = document.getElementById('voteContent');
  content.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const res = await fetch(`${API}/polls/${pollId}`);
    const poll = await res.json();
    if (!res.ok) throw new Error();

    content.innerHTML = `
      <h2>${escHtml(poll.question)}</h2>
      ${!currentUser ? `<p style="color:var(--muted);margin-bottom:1.5rem;font-size:.9rem">⚠️ Please <a href="#" onclick="showSection('login')" style="color:var(--accent)">login</a> to vote</p>` : ''}
      ${poll.options.map(opt => `
        <button class="option-btn" onclick="castVote('${poll._id}','${opt._id}')" ${!currentUser || !poll.isActive ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
          <div class="opt-dot"></div>
          ${escHtml(opt.text)}
        </button>`).join('')}
      ${!poll.isActive ? '<p style="color:var(--muted);font-size:.85rem;margin-top:.5rem">This poll is closed.</p>' : ''}
    `;
  } catch {
    content.innerHTML = '<p style="color:var(--error)">Could not load poll.</p>';
  }
}

async function castVote(pollId, optionId) {
  if (!currentUser) { toast('Please login to vote'); showSection('login'); return; }

  try {
    const res = await fetch(`${API}/polls/${pollId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ optionId })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.message || 'Vote failed'); return; }

    toast('✅ Vote cast successfully!');
    showSection('results');
    loadResults();
  } catch {
    toast('Server error. Try again.');
  }
}

/* ── Results ───────────────────────────────────── */
async function loadResults() {
  const list = document.getElementById('resultsList');
  list.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const res = await fetch(`${API}/polls`);
    const polls = await res.json();

    if (!polls.length) {
      list.innerHTML = '<div class="empty-state"><div class="emoji">📊</div><p>No results yet.</p></div>';
      return;
    }

    list.innerHTML = polls.map(poll => {
      const total = poll.options.reduce((a, o) => a + o.votes, 0);
      const maxVotes = Math.max(...poll.options.map(o => o.votes));

      const bars = poll.options.map(opt => {
        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
        const isWinner = opt.votes === maxVotes && maxVotes > 0;
        return `
          <div class="result-option">
            <div class="result-option-top">
              <span class="result-option-label">${escHtml(opt.text)}${isWinner ? ' 👑' : ''}</span>
              <span class="result-option-count">${opt.votes} (${pct}%)</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill ${isWinner ? 'winner' : ''}" style="width:${pct}%"></div>
            </div>
          </div>`;
      }).join('');

      return `
        <div class="result-card">
          <h3>${escHtml(poll.question)}</h3>
          ${bars}
          <p style="font-size:.78rem;color:var(--muted);margin-top:1rem">Total votes: ${total}</p>
        </div>`;
    }).join('');
  } catch {
    list.innerHTML = '<div class="empty-state"><div class="emoji">⚠️</div><p>Could not load results.</p></div>';
  }
}

/* ── Admin ─────────────────────────────────────── */
async function createPoll() {
  const question = document.getElementById('pollQuestion').value.trim();
  const optionsRaw = document.getElementById('pollOptions').value.trim();
  const msg = document.getElementById('adminMsg');

  if (!question || !optionsRaw) return setMsg(msg, 'Question and options required', 'error');
  const options = optionsRaw.split('\n').map(o => o.trim()).filter(Boolean);
  if (options.length < 2) return setMsg(msg, 'At least 2 options required', 'error');

  try {
    const res = await fetch(`${API}/polls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ question, options })
    });
    const data = await res.json();
    if (!res.ok) return setMsg(msg, data.message || 'Error', 'error');
    setMsg(msg, '✅ Poll created!', 'success');
    document.getElementById('pollQuestion').value = '';
    document.getElementById('pollOptions').value = '';
    loadAdminPolls();
  } catch {
    setMsg(msg, 'Server error', 'error');
  }
}

async function loadAdminPolls() {
  const list = document.getElementById('adminPollsList');
  list.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const res = await fetch(`${API}/polls`);
    const polls = await res.json();

    if (!polls.length) {
      list.innerHTML = '<p style="color:var(--muted)">No polls yet.</p>';
      return;
    }

    list.innerHTML = polls.map(p => `
      <div class="admin-poll-item">
        <div class="admin-poll-item-text">
          <span>${escHtml(p.question)}</span>
          <small>${p.options.reduce((a, o) => a + o.votes, 0)} votes · ${p.isActive ? '🟢 Active' : '🔴 Closed'}</small>
        </div>
        <button class="btn-danger" onclick="togglePoll('${p._id}',${p.isActive})">${p.isActive ? 'Close' : 'Reopen'}</button>
        <button class="btn-danger" onclick="deletePoll('${p._id}')">Delete</button>
      </div>`).join('');
  } catch {
    list.innerHTML = '<p style="color:var(--error)">Error loading polls</p>';
  }
}

async function togglePoll(pollId, isActive) {
  try {
    await fetch(`${API}/polls/${pollId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ isActive: !isActive })
    });
    toast(`Poll ${isActive ? 'closed' : 'reopened'}`);
    loadAdminPolls();
  } catch { toast('Error updating poll'); }
}

async function deletePoll(pollId) {
  if (!confirm('Delete this poll permanently?')) return;
  try {
    await fetch(`${API}/polls/${pollId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    toast('Poll deleted');
    loadAdminPolls();
  } catch { toast('Error deleting poll'); }
}

/* ── Helpers ───────────────────────────────────── */
function setMsg(el, text, type) {
  el.textContent = text;
  el.className = `msg ${type}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
