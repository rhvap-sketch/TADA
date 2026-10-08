// ─────────────────────────────────────────────────────────────
// Login / Register page logic
// ─────────────────────────────────────────────────────────────

function showTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
  document.getElementById('registerForm').classList.toggle('hidden', isLogin);

  document.getElementById('tabLogin').className = isLogin
    ? 'flex-1 py-2 rounded-md font-semibold text-sm bg-white shadow text-blue-700'
    : 'flex-1 py-2 rounded-md font-semibold text-sm text-slate-600';
  document.getElementById('tabRegister').className = !isLogin
    ? 'flex-1 py-2 rounded-md font-semibold text-sm bg-white shadow text-green-700'
    : 'flex-1 py-2 rounded-md font-semibold text-sm text-slate-600';

  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('regError').classList.add('hidden');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

// Login submit
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    await DB.login({ email, password });
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError('loginError', err.message);
  }
});

// Register submit
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const password2 = document.getElementById('regPassword2').value;

  if (password !== password2) return showError('regError', 'पासवर्डहरू मिलेनन्');
  if (password.length < 6) return showError('regError', 'पासवर्ड कम्तीमा ६ अक्षर');

  try {
    const user = await DB.register({ name, email, password });
    // Auto-login after register
    await DB.login({ email, password });
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError('regError', err.message);
  }
});