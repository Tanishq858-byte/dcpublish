/* Merged & polished script.js
   - Auth UI injection + modals
   - Toasts (aria-live) + fallback notification
   - Idea loading & rendering
   - Stats animation + intersection observer
   - Accessibility widget handlers
   - Minor accessibility improvements: focus management for modals
*/

const API_BASE = "http://127.0.0.1:5000"; // adjust if needed

/* ---------- Utility & UX helpers ---------- */
function createLiveRegion() {
  let el = document.getElementById('ic-live');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ic-live';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.overflow = 'hidden';
    document.body.appendChild(el);
  }
  return el;
}
const liveRegion = createLiveRegion();

function toast(message, type = 'info', timeout = 3500) {
  // accessible live region
  liveRegion.textContent = message;

  // visual toast
  let container = document.getElementById('ic-toast');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ic-toast';
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.style.zIndex = 99999;
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }

  const t = document.createElement('div');
  t.className = `ic-toast-item ic-${type}`;
  t.textContent = message;
  t.style.padding = '10px 14px';
  t.style.borderRadius = '10px';
  t.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
  t.style.background = type === 'error' ? '#fff0f0' : type === 'success' ? '#f0fff4' : '#ffffff';
  t.style.color = '#111';
  t.style.fontWeight = '700';
  t.style.opacity = '0';
  t.style.transform = 'translateY(8px)';
  t.style.transition = 'opacity .24s ease, transform .24s ease';
  container.appendChild(t);

  // animate in
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 300);
  }, timeout);
}

/* legacy fallback notification */
function showNotification(message, type = 'info') {
  toast(message, type);
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notificationText');
  if (notification && notificationText) {
    notificationText.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
  }
}

/* spinner small SVG */
function spinnerHTML(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="20" stroke-width="4" stroke="#333" stroke-opacity="0.18" fill="none"/><path d="M45 25a20 20 0 0 1-20 20" stroke="#333" stroke-width="4" fill="none"/></svg>`;
}

const fetchWithCreds = (url, opts = {}) => {
  opts.credentials = 'include';
  return fetch(url, opts);
};

/* ---------- Auth UI injection & modals ---------- */
function injectAuthUI() {
  const header = document.querySelector('header .nav-container');
  if (!header) return;

  if (!document.getElementById('ic-account-wrap')) {
    const wrap = document.createElement('div');
    wrap.id = 'ic-account-wrap';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';
    wrap.style.marginLeft = '16px';
    wrap.style.justifyContent = 'flex-end';
    // insert before nav-actions
    const navActions = header.querySelector('.nav-actions');
    header.insertBefore(wrap, navActions);
  }

  const accountWrap = document.getElementById('ic-account-wrap');
  accountWrap.innerHTML = `
    <button id="ic-login-btn" class="cta-button" aria-haspopup="dialog">Log in</button>
    <button id="ic-signup-btn" class="secondary-button" aria-haspopup="dialog">Sign up</button>
    <div id="ic-user-menu" style="display:none;align-items:center;gap:8px;">
      <span id="ic-user-name" style="font-weight:700;color:#fff"></span>
      <span id="ic-verified-badge" style="display:none;background:#e6ffef;color:#0a7a3a;padding:4px 8px;border-radius:12px;font-size:12px;">Verified</span>
      <button id="ic-logout-btn" class="secondary-button">Logout</button>
    </div>
  `;

  // container for injected auth modals
  if (!document.getElementById('ic-modals')) {
    const container = document.createElement('div');
    container.id = 'ic-modals';
    document.body.appendChild(container);
  }

  /* Login modal */
  if (!document.getElementById('ic-login-modal')) {
    const loginModal = document.createElement('div');
    loginModal.id = 'ic-login-modal';
    loginModal.className = 'ic-modal';
    loginModal.innerHTML = `
      <div class="ic-modal-backdrop" data-modal="backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:10000;"></div>
      <div class="ic-modal-card" role="dialog" aria-modal="true" aria-labelledby="ic-login-title" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;width:360px;padding:18px;border-radius:10px;z-index:10001;box-shadow:0 12px 40px rgba(0,0,0,0.12);">
        <h3 id="ic-login-title" style="margin:0 0 8px 0;">Log in to Ignite Code</h3>
        <p style="margin:0 0 14px 0;color:#666">Please log in with your email</p>
        <form id="ic-login-form">
          <input required id="ic-login-email" type="email" placeholder="Email" style="width:100%;padding:10px;margin-bottom:8px;border-radius:8px;border:1px solid #ddd" />
          <input required id="ic-login-password" type="password" placeholder="Password" style="width:100%;padding:10px;margin-bottom:8px;border-radius:8px;border:1px solid #ddd" />
          <div style="display:flex;gap:8px;align-items:center;justify-content:flex-end;">
            <button type="button" id="ic-login-cancel" class="secondary-button">Cancel</button>
            <button type="submit" id="ic-login-submit" class="cta-button">Log in</button>
          </div>
          <p style="margin:12px 0 0 0;font-size:13px;color:#444">Didn't get verification? <a id="ic-resend-link" href="#" style="font-weight:700">Resend email</a></p>
        </form>
      </div>
    `;
    document.getElementById('ic-modals').appendChild(loginModal);
  }

  /* Signup modal */
  if (!document.getElementById('ic-signup-modal')) {
    const signupModal = document.createElement('div');
    signupModal.id = 'ic-signup-modal';
    signupModal.className = 'ic-modal';
    signupModal.innerHTML = `
      <div class="ic-modal-backdrop" data-modal="backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:10000;"></div>
      <div class="ic-modal-card" role="dialog" aria-modal="true" aria-labelledby="ic-signup-title" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;width:420px;padding:18px;border-radius:10px;z-index:10001;box-shadow:0 12px 40px rgba(0,0,0,0.12);">
        <h3 id="ic-signup-title" style="margin:0 0 8px 0;">Create your account</h3>
        <p style="margin:0 0 12px 0;color:#666">We'll send a verification link to your email.</p>
        <form id="ic-signup-form">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input required id="ic-signup-first" placeholder="First name" style="padding:10px;border-radius:8px;border:1px solid #ddd" />
            <input required id="ic-signup-last" placeholder="Last name" style="padding:10px;border-radius:8px;border:1px solid #ddd" />
          </div>
          <input required id="ic-signup-email" type="email" placeholder="Email" style="width:100%;padding:10px;margin-top:8px;border-radius:8px;border:1px solid #ddd" />
          <input required id="ic-signup-password" type="password" placeholder="Choose a password" style="width:100%;padding:10px;margin-top:8px;border-radius:8px;border:1px solid #ddd" />
          <div style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:12px">
            <button type="button" id="ic-signup-cancel" class="secondary-button">Cancel</button>
            <button type="submit" id="ic-signup-submit" class="cta-button">Sign up</button>
          </div>
        </form>
      </div>
    `;
    document.getElementById('ic-modals').appendChild(signupModal);
  }
}

/* ---------- Auth state and UI reflection ---------- */
let currentAuth = { loggedIn: false, user: null, verified: false };

async function checkAuth() {
  try {
    const res = await fetchWithCreds(`${API_BASE}/auth/me`, { method: 'GET' });
    if (res.ok) {
      const payload = await res.json();
      currentAuth = { loggedIn: true, user: payload.user, verified: payload.verified === true };
    } else {
      currentAuth = { loggedIn: false, user: null, verified: false };
    }
  } catch (err) {
    console.warn('Auth check failed', err);
    currentAuth = { loggedIn: false, user: null, verified: false };
  }
  reflectAuthInUI();
}

function reflectAuthInUI() {
  const loginBtn = document.getElementById('ic-login-btn');
  const signupBtn = document.getElementById('ic-signup-btn');
  const userMenu = document.getElementById('ic-user-menu');
  const userName = document.getElementById('ic-user-name');
  const verifiedBadge = document.getElementById('ic-verified-badge');

  if (!loginBtn || !signupBtn || !userMenu) return;

  if (currentAuth.loggedIn) {
    loginBtn.style.display = 'none';
    signupBtn.style.display = 'none';
    userMenu.style.display = 'flex';
    userName.textContent = currentAuth.user?.firstName || currentAuth.user?.name || 'Member';
    verifiedBadge.style.display = currentAuth.verified ? 'inline-block' : 'none';
  } else {
    loginBtn.style.display = 'inline-block';
    signupBtn.style.display = 'inline-block';
    userMenu.style.display = 'none';
  }

  // protect CTA buttons if not verified
  const ideaButtons = document.querySelectorAll('.cta-button, #submitIdeaBtn, #ctaIdeaBtn');
  ideaButtons.forEach(btn => {
    if (!currentAuth.loggedIn || !currentAuth.verified) {
      btn.classList.add('ic-locked');
      btn.setAttribute('aria-disabled', 'true');
      btn.title = currentAuth.loggedIn ? 'Verify your email to use this' : 'Please log in to use this';
    } else {
      btn.classList.remove('ic-locked');
      btn.removeAttribute('aria-disabled');
      btn.title = '';
    }
  });
}

/* open/close utility for modals (works for injected modals too) */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'grid';
  el.setAttribute('aria-hidden', 'false');
  // focus first input
  const first = el.querySelector('input, button, textarea, select');
  if (first) first.focus();
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
}

/* Focus trap for simple modal accessibility (basic) */
function trapFocus(modalEl) {
  if (!modalEl) return;
  const focusable = modalEl.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  const handler = (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    } else if (e.key === 'Escape') {
      modalEl.style.display = 'none';
    }
  };
  modalEl.addEventListener('keydown', handler);
  // return remover
  return () => modalEl.removeEventListener('keydown', handler);
}

/* ---------- Wire auth modals & handlers ---------- */
function wireAuthModals() {
  const loginBtn = document.getElementById('ic-login-btn');
  const signupBtn = document.getElementById('ic-signup-btn');

  if (loginBtn) loginBtn.addEventListener('click', () => openModal('ic-login-modal'));
  if (signupBtn) signupBtn.addEventListener('click', () => openModal('ic-signup-modal'));

  // close / cancel buttons for injected modals
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.matches('#ic-login-cancel')) closeModal('ic-login-modal');
    if (target.matches('#ic-signup-cancel')) closeModal('ic-signup-modal');
    // backdrop click closes
    if (target.closest('.ic-modal') && target.dataset.modal === 'backdrop') {
      const modal = target.closest('.ic-modal');
      if (modal) modal.style.display = 'none';
    }
  });

  // resend verification link
  const resend = document.getElementById('ic-resend-link');
  if (resend) resend.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('ic-login-email')?.value;
    if (!email) return toast('Enter your email above then click Resend', 'error');
    try {
      const res = await fetch(`${API_BASE}/auth/resend`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      if (res.ok) toast('Verification email resent — check your inbox', 'success');
      else {
        const err = await res.json().catch(() => ({ error: 'Could not resend' }));
        toast(err.error || 'Could not resend', 'error');
      }
    } catch (err) { console.error(err); toast('Network error', 'error'); }
  });

  /* Login submit */
  const loginForm = document.getElementById('ic-login-form');
  if (loginForm) loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('ic-login-email')?.value;
    const password = document.getElementById('ic-login-password')?.value;
    const submitBtn = document.getElementById('ic-login-submit');
    const prev = submitBtn?.innerHTML;
    if (submitBtn) { submitBtn.innerHTML = spinnerHTML(14) + ' Logging in...'; submitBtn.disabled = true; }
    try {
      const res = await fetchWithCreds(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        toast('Welcome back!', 'success');
        closeModal('ic-login-modal');
        await checkAuth();
      } else {
        const body = await res.json().catch(() => ({ error: 'Login failed' }));
        if (res.status === 403 || (body.error && body.error.toLowerCase().includes('verify'))) {
          toast(body.error || 'Email not verified. Check your inbox.', 'error', 5000);
        } else toast(body.error || 'Invalid credentials', 'error');
      }
    } catch (err) { console.error(err); toast('Network error', 'error'); }
    finally { if (submitBtn) { submitBtn.innerHTML = prev; submitBtn.disabled = false; } }
  });

  /* Signup submit */
  const signupForm = document.getElementById('ic-signup-form');
  if (signupForm) signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const first = document.getElementById('ic-signup-first')?.value.trim();
    const last = document.getElementById('ic-signup-last')?.value.trim();
    const email = document.getElementById('ic-signup-email')?.value.trim();
    const password = document.getElementById('ic-signup-password')?.value;
    const submitBtn = document.getElementById('ic-signup-submit');
    if (!first || !email || !password) return toast('Please fill required fields', 'error');
    const prev = submitBtn?.innerHTML;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = spinnerHTML(14) + ' Creating...'; }
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: first, lastName: last, email, password })
      });
      if (res.ok) { toast('Account created — verification email sent', 'success', 5000); closeModal('ic-signup-modal'); }
      else { const body = await res.json().catch(() => ({ error: 'Signup failed' })); toast(body.error || 'Signup failed', 'error'); }
    } catch (err) { console.error(err); toast('Network error', 'error'); }
    finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = prev; } }
  });

  /* Logout */
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'ic-logout-btn') handleLogout();
  });
}

async function handleLogout() {
  try {
    const res = await fetchWithCreds(`${API_BASE}/auth/logout`, { method: 'POST' });
    if (res.ok) {
      toast('Logged out', 'success');
      currentAuth = { loggedIn: false, user: null, verified: false };
      reflectAuthInUI();
    } else toast('Could not log out', 'error');
  } catch (err) { console.error(err); toast('Network error', 'error'); }
}

/* ---------- Load users (legacy/fallback) ---------- */
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/get`);
    if (res.ok) {
      const users = await res.json();
      const userList = document.getElementById('userList');
      if (userList) {
        userList.innerHTML = '';
        users.forEach(u => {
          const li = document.createElement('li');
          li.textContent = `${u.id}: ${u.name || u.email || 'User'}`;
          userList.appendChild(li);
        });
      }
    } else {
      // fallback to local DB if exists (legacy)
      if (typeof DB !== 'undefined' && DB.getUsers) {
        const users = DB.getUsers();
        const userList = document.getElementById('userList');
        if (userList) {
          userList.innerHTML = '';
          users.forEach(u => { const li = document.createElement('li'); li.textContent = `${u.id || '-'}: ${u.firstName || u.name || u.email || 'User'}`; userList.appendChild(li); });
        }
      }
    }
  } catch (err) {
    console.warn('Error loading users', err);
  }
}

/* ---------- Stats animation ---------- */
function animateValue(id, start, end, duration) {
  const el = document.getElementById(id);
  if (!el) return;
  let startTime = null;
  const step = (ts) => {
    if (!startTime) startTime = ts;
    const progress = Math.min((ts - startTime) / duration, 1);
    el.textContent = Math.floor(progress * (end - start) + start);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* observe stats */
const statsEl = document.getElementById('our-impact');
if (statsEl) {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateValue('ideasCount', 0, 1250, 2000);
        animateValue('startupsCount', 0, 240, 2000);
        animateValue('membersCount', 0, 5600, 2000);
        animateValue('countriesCount', 0, 85, 2000);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  observer.observe(statsEl);
}

/* ---------- Idea submission + registration protection ---------- */
async function setupIdeaProtection() {

  // IDEA FORM
  const ideaForm = document.getElementById('ideaForm');
  if (ideaForm) {
    ideaForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!currentAuth.loggedIn) { toast('Please log in to submit ideas', 'error'); openModal('ic-login-modal'); return; }
      if (!currentAuth.verified) { toast('Please verify your email before submitting ideas', 'error', 5000); return; }

      const formData = new FormData(this);
      const tags = (formData.get('ideaTags') || '').split(',').map(t => t.trim()).filter(Boolean);
      const ideaPayload = {
        title: formData.get('ideaTitle'),
        description: formData.get('ideaDescription'),
        category: formData.get('ideaCategory'),
        tags,
        image: "https://images.unsplash.com/photo-1518823380156-2dd66e1745e3?auto=format&fit=crop&w=500&q=80"
      };

      const submitBtn = this.querySelector('button[type="submit"]');
      const prev = submitBtn?.innerHTML;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = spinnerHTML(14) + ' Submitting...'; }

      try {
        const res = await fetchWithCreds(`${API_BASE}/api/ideas`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ideaPayload)
        });
        if (res.ok) {
          showNotification('Your idea has been submitted successfully!', 'success');
          loadIdeas();
          this.reset();
          const modal = document.getElementById('ideaModal'); if (modal) modal.style.display = 'none';
        } else {
          const body = await res.json().catch(() => ({}));
          showNotification(body.error || 'Could not submit idea', 'error');
        }
      } catch (err) {
        console.error(err);
        showNotification('Network error while submitting idea', 'error');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = prev; }
      }
    });
  }

  // REGISTRATION FORM
  const regForm = document.getElementById('registrationForm');
  if (regForm) {
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!currentAuth.loggedIn) { toast('Please log in to register', 'error'); openModal('ic-login-modal'); return; }
      if (!currentAuth.verified) { toast('Please verify your email before registering', 'error', 5000); return; }

      const fd = new FormData(this);
      const user = {
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
        email: fd.get('email'),
        password: fd.get('password'),
        educationLevel: fd.get('educationLevel'),
        interests: fd.get('interests'),
        about: fd.get('about'),
        joined: new Date().toISOString()
      };

      try {
        const res = await fetchWithCreds(`${API_BASE}/api/profile`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user)
        });
        if (res.ok) {
          showNotification('Registration successful! Welcome to Ignite Code.', 'success');
          this.reset();
          loadUsers();
        } else {
          // fallback local DB if present
          if (typeof DB !== 'undefined' && DB.addUser) {
            DB.addUser(user);
            showNotification('Registration saved locally', 'success');
            this.reset();
            loadUsers();
          } else {
            const body = await res.json().catch(() => ({}));
            showNotification(body.error || 'Could not register', 'error');
          }
        }
      } catch (err) {
        console.error(err);
        if (typeof DB !== 'undefined' && DB.addUser) {
          DB.addUser(user);
          showNotification('Registration saved locally', 'success');
          this.reset();
          loadUsers();
        } else showNotification('Network error while registering', 'error');
      }
    });
  }
}

/* ---------- Ideas loading & rendering ---------- */
async function loadIdeas() {
  const container = document.getElementById('ideasContainer');
  if (container) container.innerHTML = `<div class="placeholder">Loading ideas…</div>`;
  try {
    const res = await fetch(`${API_BASE}/api/ideas`);
    if (!res.ok) {
      if (typeof DB !== 'undefined' && DB.getIdeas) { renderIdeas(DB.getIdeas()); return; }
      throw new Error('Failed to fetch ideas');
    }
    const ideas = await res.json();
    ideas.forEach(i => { if (typeof i.tags === 'string') i.tags = i.tags ? i.tags.split(',').map(t => t.trim()) : []; });
    renderIdeas(ideas);
  } catch (err) {
    console.warn('Error loading ideas:', err);
    if (typeof DB !== 'undefined' && DB.getIdeas) renderIdeas(DB.getIdeas());
    else {
      const fallback = [{
        title: 'Campus Compost Bot',
        description: 'A simple bot to collect organic waste on campuses and turn it into compost.',
        tags: ['Sustainability', 'EdTech'],
        image: 'https://images.unsplash.com/photo-1505575967454-47f8b1f7e74e?auto=format&fit=crop&w=800&q=60'
      }];
      renderIdeas(fallback);
    }
  }
}

function renderIdeas(ideas = []) {
  const c = document.getElementById('ideasContainer');
  if (!c) return;
  c.innerHTML = '';
  if (!ideas.length) {
    c.innerHTML = `<div class="placeholder">No ideas yet — be the first to submit one!</div>`;
    return;
  }
  ideas.forEach(idea => {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.innerHTML = `
      <div class="idea-image"><img src="${escapeHtml(idea.image || '')}" alt="${escapeHtml(idea.title)}"></div>
      <div class="idea-content">
        <h3>${escapeHtml(idea.title)}</h3>
        <p>${escapeHtml(idea.description)}</p>
        <div class="idea-tags">${Array.isArray(idea.tags) ? idea.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') : ''}</div>
        <div style="margin-top:12px"><button class="secondary-button" aria-label="View details for ${escapeHtml(idea.title)}">View Details</button></div>
      </div>
    `;
    c.appendChild(card);
  });
}

/* small HTML escape */
function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

/* ---------- Accessibility widget wiring ---------- */
function wireAccessibilityWidget() {
  const widgetToggle = document.getElementById('widgetToggle');
  const widgetPanel = document.getElementById('widgetPanel');
  const resetButton = document.getElementById('resetButton');

  if (widgetToggle && widgetPanel) {
    widgetToggle.addEventListener('click', function () {
      const open = widgetPanel.classList.toggle('open');
      widgetToggle.setAttribute('aria-expanded', String(open));
      widgetPanel.setAttribute('aria-hidden', String(!open));
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.accessibility-widget') && widgetPanel.classList.contains('open')) {
        widgetPanel.classList.remove('open');
        widgetToggle.setAttribute('aria-expanded', 'false');
        widgetPanel.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // wire options (IDs match markup)
  const map = [
    ['highContrast', (e) => document.body.classList.toggle('high-contrast', e.target.checked)],
    ['smartContrast', (e) => {
      if (e.target.checked) { document.body.style.filter = 'invert(1) hue-rotate(180deg)'; document.body.style.background = '#fff'; }
      else { document.body.style.filter = 'none'; document.body.style.background = ''; }
    }],
    ['highlightLinks', (e) => document.body.classList.toggle('highlight-links', e.target.checked)],
    ['biggerText', (e) => document.body.classList.toggle('bigger-text', e.target.checked)],
    ['textSpacing', (e) => document.body.classList.toggle('text-spacing', e.target.checked)],
    ['pauseAnimations', (e) => document.body.classList.toggle('pause-animations', e.target.checked)],
    ['hideImages', (e) => document.body.classList.toggle('hide-images', e.target.checked)],
    ['dyslexiaFriendly', (e) => document.body.classList.toggle('dyslexia-friendly', e.target.checked)]
  ];
  map.forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', fn);
  });

  // screenReader (demo)
  const sr = document.getElementById('screenReader');
  if (sr) sr.addEventListener('change', function (e) {
    if (e.target.checked) {
      alert('Screen reader mode activated. This demo will announce the site title.');
      speakText('Ignite Code — Student Startup Ideas. Accessibility options enabled.');
    }
  });

  const cursor = document.getElementById('cursorSize');
  if (cursor) {
    cursor.addEventListener('change', (e) => {
      document.body.classList.remove('large-cursor', 'extra-large-cursor');
      if (e.target.value === 'large') document.body.classList.add('large-cursor');
      else if (e.target.value === 'x-large') document.body.classList.add('extra-large-cursor');
    });
  }

  if (resetButton) resetButton.addEventListener('click', () => {
    widgetPanel.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    const cursor = document.getElementById('cursorSize');
    if (cursor) cursor.value = 'default';
    document.body.classList.remove('high-contrast', 'bigger-text', 'text-spacing', 'highlight-links', 'hide-images', 'pause-animations', 'dyslexia-friendly', 'large-cursor', 'extra-large-cursor');
    document.body.style.filter = 'none'; document.body.style.background = '';
    alert('All accessibility options have been reset.');
  });

  function speakText(text) {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utter);
    } else console.log('Screen reader text:', text);
  }
}

/* ---------- Mobile menu toggle ---------- */
function wireMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const nav = document.querySelector('.nav-links');
  if (!menuBtn || !nav) return;
  menuBtn.addEventListener('click', () => {
    const active = nav.classList.toggle('active');
    menuBtn.setAttribute('aria-expanded', String(active));
  });
}

/* ---------- Hook up hero / CTA buttons ---------- */
function wireCTAs() {
  // Avoid attaching the default "scroll to register" handler if a video modal exists.
  const gsBtn = document.getElementById('getStartedBtn');
  if (gsBtn) {
    if (!document.getElementById('videoModal')) {
      gsBtn.addEventListener('click', () => {
        document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } else {
      // If videoModal exists, the video modal wiring will attach the click handler.
      // (No-op here to avoid conflicting handlers.)
    }
  }

  const openIdeaBtns = document.querySelectorAll('.cta-button:not(#getStartedBtn)');
  openIdeaBtns.forEach(btn => btn.addEventListener('click', (e) => {
    if (!currentAuth.loggedIn) { openModal('ic-login-modal'); toast('Log in to submit ideas', 'info'); return; }
    if (!currentAuth.verified) { toast('Please verify your email to submit ideas', 'error', 5000); return; }
    const modal = document.getElementById('ideaModal');
    if (modal) { modal.style.display = 'grid'; modal.setAttribute('aria-hidden', 'false'); modal.querySelector('input,textarea,select')?.focus(); }
  }));

  // close idea modal
  document.querySelectorAll('.close-modal').forEach(el => el.addEventListener('click', () => {
    const m = el.closest('.modal'); if (m) { m.style.display = 'none'; m.setAttribute('aria-hidden', 'true'); }
  }));
}

/* ---------- Video modal wiring (robust) ---------- */
function setupVideoModal() {
  const openBtn = document.getElementById('getStartedBtn');
  const modal = document.getElementById('videoModal');
  const closeBtn = document.getElementById('closeVideo');
  const ytFrame = document.getElementById('ytVideo');

  if (!openBtn || !modal || !closeBtn || !ytFrame) {
    // Not fatal — simply skip video wiring if markup not present.
    console.warn('Video modal: required elements missing. Check IDs: getStartedBtn, videoModal, closeVideo, ytVideo');
    return;
  }

  function openModal() {
    const videoId = ytFrame.dataset.videoId || 'dQw4w9WgXcQ';
    // set src when opening (prevents preloading). mute=1 helps autoplay on many browsers.
    ytFrame.src = `https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1&autoplay=1&mute=1`;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    // move focus for accessibility
    closeBtn.focus();
    console.log('Video modal opened, playing:', videoId);
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    // clear src to stop playback & free resources
    ytFrame.src = '';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    openBtn.focus();
    console.log('Video modal closed.');
  }

  // wire events
  openBtn.addEventListener('click', function (e) {
    e.preventDefault();
    openModal();
  });

  closeBtn.addEventListener('click', function () {
    closeModal();
  });

  // click outside content to close
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  // esc to close
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });
}

/* ---------- Load initial data and wire everything ---------- */
document.addEventListener('DOMContentLoaded', function () {
  // inject auth UI and wire events
  injectAuthUI();
  wireAuthModals();

  // run auth check then setup protected handlers
  checkAuth().then(() => setupIdeaProtection());

  // wire other UI bits
  wireMobileMenu();
  wireCTAs();
  wireAccessibilityWidget();

  // Setup video modal if present
  setupVideoModal();

  // original idea modal wiring (keeps behaviour compatible)
  const ideaModal = document.getElementById('ideaModal');
  if (ideaModal) ideaModal.addEventListener('keydown', (e) => { if (e.key === 'Escape') ideaModal.style.display = 'none'; });

  // load remote data
  loadIdeas();
  loadUsers();

  // wire logout button (may have been added by injected UI)
  document.getElementById('ic-logout-btn')?.addEventListener('click', handleLogout);

  // close injected modals on backdrop clicks
  document.addEventListener('click', (e) => {
    if (e.target.matches('.ic-modal-backdrop')) {
      const modal = e.target.closest('.ic-modal');
      if (modal) modal.style.display = 'none';
    }
  });

  // ensure focus trap for the ideaModal
  const cleanupTrap = trapFocus(document.getElementById('ideaModal') || null);
  // note: no need to keep reference for injected modals — they are created dynamically in the DOM and get basic focus

  // optional: add small keyboard shortcut to open login (for power users)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') openModal('ic-login-modal');
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("hero-title");
  if (!el) return;

  const phrases = [
    "Fuel the Fire of Innovation",
    "Spark Bold Startup Ideas",
    "Connect with Mentors & Collaborators"
  ];
  let idx = 0;
  let charPos = 0;
  let isDeleting = false;

  function typeLoop() {
    const current = phrases[idx];
    el.textContent = isDeleting
      ? current.substring(0, charPos--)
      : current.substring(0, charPos++);

    if (!isDeleting && charPos === current.length + 1) {
      isDeleting = true;
      setTimeout(typeLoop, 1500);
    } else if (isDeleting && charPos === -1) {
      isDeleting = false;
      idx = (idx + 1) % phrases.length;
      setTimeout(typeLoop, 500);
    } else {
      setTimeout(typeLoop, isDeleting ? 60 : 120);
    }
  }
  typeLoop();
});

// const API_BASE = 'https://api.ignitecode.org'; // replace with your actual API base URL
