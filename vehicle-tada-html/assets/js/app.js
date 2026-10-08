const App = (() => {
  function currentUser() { return DB.currentUser(); }
  function currentUserId() { return DB.currentUserId(); }

  function logout() {
    DB.logout();
    window.location.href = 'index.html';
  }

  function requireAuth() {
    if (!currentUser()) { window.location.href = 'index.html'; return false; }
    return true;
  }
  function requireAdmin() {
    if (!requireAuth()) return false;
    if (currentUser().role !== 'ADMIN') {
      alert('एडमिन अनुमति आवश्यक छ');
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }

  const NAV = [
    { href: 'dashboard.html',    icon: '🏠', ne: 'ड्यासबोर्ड',          en: 'Dashboard' },
    { href: 'logbook-new.html',  icon: '📓', ne: 'नयाँ लगबुक',          en: 'New Logbook' },
    { href: 'logbook-list.html', icon: '📋', ne: 'मेरो लगबुक',          en: 'My Logbooks' },
    { href: 'tada-new.html',     icon: '✈️', ne: 'नयाँ भ्रमण आदेश',     en: 'New Travel Order' },
    { href: 'tada-list.html',    icon: '📄', ne: 'मेरो भ्रमण आदेश',     en: 'My Travel Orders' },
    { href: 'approvals.html',    icon: '✅', ne: 'स्वीकृति केन्द्र',     en: 'Approvals', adminOnly: true },
    { href: 'users.html',        icon: '👥', ne: 'प्रयोगकर्ता',          en: 'Users',     adminOnly: true },
    { href: 'settings.html',     icon: '⚙️', ne: 'सेटिङ',               en: 'Settings' },
  ];

  function renderShell(activePage) {
    const u = currentUser();
    if (!u) return;

    const navHtml = NAV
      .filter(n => !n.adminOnly || u.role === 'ADMIN')
      .map(n => `
        <a href="${n.href}"
           class="flex items-center gap-3 px-4 py-3 rounded-lg transition
                  ${activePage === n.href
                    ? 'bg-blue-700 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'}">
          <span class="text-lg">${n.icon}</span>
          <span>${n.ne}</span>
          <span class="ml-auto text-xs opacity-60">${n.en}</span>
        </a>`).join('');

    const existingNodes = [];
    Array.from(document.body.children).forEach(child => {
      if (child.tagName === 'SCRIPT') return;
      existingNodes.push(child);
    });

    const shellHtml = `
      <div class="flex min-h-screen">
        <aside class="w-72 bg-white border-r border-slate-200 flex-shrink-0 hidden md:flex md:flex-col">
          <a href="dashboard.html" class="p-5 border-b border-slate-200 block hover:bg-slate-50 transition cursor-pointer" title="Go to Dashboard">
            <div class="flex items-center gap-3">
              <img src="assets/img/nepal-emblem.png" alt="Nepal Emblem" class="w-12 h-12 object-contain flex-shrink-0">
              <div>
                <div class="font-bold text-slate-800 text-sm leading-tight">सवारी लगबुक र भ्रमण आदेश</div>
                <div class="text-xs text-slate-500">Document System</div>
              </div>
            </div>
          </a>
          <nav class="flex-1 p-3 space-y-1 overflow-y-auto">${navHtml}</nav>
          <div class="p-4 border-t border-slate-200">
            <div class="text-xs text-slate-500 mb-1">ID: <b class="font-mono">${u.userId || '—'}</b></div>
            <div class="text-sm font-medium text-slate-800 truncate">${u.name}</div>
            <div class="text-xs text-slate-500 truncate">${u.email}</div>
            <div class="text-xs mt-1">
              <span class="inline-block px-2 py-0.5 rounded ${u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'} font-semibold">
                ${u.role}
              </span>
            </div>
            <button onclick="App.logout()"
                    class="mt-3 w-full text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg transition">
              लगआउट / Logout
            </button>
          </div>
        </aside>

        <main class="flex-1 min-w-0">
          <header class="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <a href="dashboard.html" class="flex items-center gap-2 min-w-0">
              <img src="assets/img/nepal-emblem.png" alt="" class="w-8 h-8 object-contain flex-shrink-0">
              <div class="font-bold text-sm truncate">सवारी लगबुक र भ्रमण आदेश</div>
            </a>
            <button onclick="App.toggleMobileNav()" class="text-2xl">☰</button>
          </header>
          <div id="mobileNav" class="md:hidden hidden bg-white border-b border-slate-200 p-3 space-y-1">${navHtml}</div>
          <div id="appContent"></div>
        </main>
      </div>`;

    existingNodes.forEach(n => n.remove());
    const template = document.createElement('template');
    template.innerHTML = shellHtml.trim();
    document.body.insertBefore(template.content.firstChild, document.body.firstChild);

    const contentArea = document.getElementById('appContent');
    existingNodes.forEach(n => contentArea.appendChild(n));
  }

  function toggleMobileNav() {
    document.getElementById('mobileNav').classList.toggle('hidden');
  }

  function toast(message, type = 'info') {
    const colors = {
      info: 'bg-blue-600', success: 'bg-green-600',
      error: 'bg-red-600', warn: 'bg-amber-600',
    };
    const el = document.createElement('div');
    el.className = `fixed top-4 right-4 z-[100] ${colors[type]} text-white px-5 py-3 rounded-lg shadow-lg max-w-sm`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  return {
    currentUser, currentUserId,
    logout, requireAuth, requireAdmin,
    renderShell, toggleMobileNav, toast,
  };
})();