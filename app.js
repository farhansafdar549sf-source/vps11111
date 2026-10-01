async function api(path, opts) {
  opts = opts || {};
  var headers = { 'Content-Type': 'application/json' };
  if (opts.headers) {
    for (var k in opts.headers) headers[k] = opts.headers[k];
  }
  var r = await fetch(path, {
    credentials: 'same-origin',
    headers: headers,
    method: opts.method || 'GET',
    body: opts.body
  });
  var j = {};
  try { j = await r.json(); } catch (e) {}
  if (r.status === 401) {
    document.getElementById('gate').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('gateErr').textContent = j.error || 'Login required';
    throw new Error('auth');
  }
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tab(name) {
  document.querySelectorAll('.panel').forEach(function (e) {
    e.classList.add('hidden');
  });
  var panel = document.getElementById('tab-' + name);
  if (panel) panel.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-tab') === name);
  });
  closeMenu();
  if (name === 'overview') loadOverview();
  if (name === 'stock' || name === 'gen') refreshStock();
  if (name === 'methods') loadMethods();
  if (name === 'giveaways') loadGiveaways();
  if (name === 'warnings') loadWarnings();
}

function openMenu() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('scrim').classList.remove('hidden');
}
function closeMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('scrim').classList.add('hidden');
}


async function doPasswordLogin() {
  var password = (document.getElementById('gatePassword') || {}).value || '';
  var err = document.getElementById('gateErr');
  if (!password) {
    if (err) err.textContent = 'Enter password';
    return;
  }
  try {
    await api('/auth/login', { method: 'POST', body: JSON.stringify({ password: password }) });
    if (err) err.textContent = '';
    await boot();
  } catch (e) {
    if (err) err.textContent = e.message || 'Wrong password';
  }
}

async function boot() {
  var s = await api('/api/status');
  if (!s.authed) {
    document.getElementById('gateErr').textContent = s.error || '';
    return;
  }
  document.getElementById('gate').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  var label = (s.userTag || s.userId) + ' · ' + (s.online ? 'bot online' : 'bot…');
  document.getElementById('sideUser').textContent = s.userTag || s.userId || '—';
  document.getElementById('topStatus').textContent = label;
  await loadOverview();
}

async function loadOverview() {
  var j = await api('/api/overview');
  var el = document.getElementById('overviewStats');
  var items = [
    ['Pay items', j.payTotal != null ? j.payTotal : 0],
    ['Gen items', j.genTotal != null ? j.genTotal : 0],
    ['Methods set', j.methodsSet != null ? j.methodsSet : 0],
    ['Active GWs', j.giveaways != null ? j.giveaways : 0],
    ['Warned users', j.warnUsers != null ? j.warnUsers : 0],
    ['Coin users', j.coinUsers != null ? j.coinUsers : 0]
  ];
  var html = '';
  for (var i = 0; i < items.length; i++) {
    html +=
      '<div class="stat"><div class="label">' +
      escapeHtml(items[i][0]) +
      '</div><div class="value">' +
      escapeHtml(items[i][1]) +
      '</div></div>';
  }
  el.innerHTML = html;
}

async function refreshStock() {
  var j = await api('/api/stock');
  var pay = j.pay || {};
  var gen = j.gen || {};
  var payHtml = '';
  var keys = Object.keys(pay);
  if (!keys.length) payHtml = '<p class="muted">Empty</p>';
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    payHtml +=
      '<div class="stock-card"><b>' +
      escapeHtml(k) +
      '</b><div class="n">' +
      escapeHtml(pay[k]) +
      '</div></div>';
  }
  document.getElementById('stockOut').innerHTML = payHtml;

  var genHtml = '';
  var gkeys = Object.keys(gen);
  if (!gkeys.length) genHtml = '<p class="muted">Empty</p>';
  for (var g = 0; g < gkeys.length; g++) {
    var gk = gkeys[g];
    genHtml +=
      '<div class="stock-card"><b>' +
      escapeHtml(gk) +
      '</b><div class="n">' +
      escapeHtml(gen[gk]) +
      '</div></div>';
  }
  document.getElementById('genOut').innerHTML = genHtml;
}

async function loadMethods() {
  var j = await api('/api/methods');
  var methods = j.methods || {};
  var keys = Object.keys(methods);
  var box = document.getElementById('methodsOut');
  if (!keys.length) {
    box.innerHTML = '<p class="muted">No method products.</p>';
    return;
  }
  var html = '';
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = methods[key] || '';
    html +=
      '<div class="card method-row" data-key="' +
      escapeHtml(key) +
      '">' +
      '<strong>' +
      escapeHtml(key) +
      '</strong>' +
      '<textarea rows="3" id="m-' +
      escapeHtml(key) +
      '" placeholder="Method text…">' +
      escapeHtml(val) +
      '</textarea>' +
      '<div class="actions">' +
      '<button type="button" class="btn primary btn-save-m" data-key="' +
      escapeHtml(key) +
      '">Save</button>' +
      '<button type="button" class="btn ghost btn-clear-m" data-key="' +
      escapeHtml(key) +
      '">Clear</button>' +
      '</div>' +
      '<p class="msg" id="mm-' +
      escapeHtml(key) +
      '"></p>' +
      '</div>';
  }
  box.innerHTML = html;
}

async function loadGiveaways() {
  var j = await api('/api/giveaways');
  var list = j.giveaways || [];
  var el = document.getElementById('gwOut');
  if (!list.length) {
    el.innerHTML = '<p class="muted">No active / stored giveaways.</p>';
    return;
  }
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var g = list[i];
    var ends = g.ends ? new Date(g.ends).toLocaleString() : '—';
    var entries = (g.entries || []).length;
    html +=
      '<div class="list-item">' +
      '<strong>' +
      escapeHtml(g.prize || 'Giveaway') +
      '</strong>' +
      '<div class="meta">Winners: ' +
      escapeHtml(g.winners != null ? g.winners : '?') +
      ' · Entries: ' +
      entries +
      ' · Ends: ' +
      escapeHtml(ends) +
      '</div>' +
      '<div class="meta">ID: ' +
      escapeHtml(g.id) +
      ' · Channel: ' +
      escapeHtml(g.channelId || '—') +
      '</div>' +
      '</div>';
  }
  el.innerHTML = html;
}

async function loadWarnings() {
  var j = await api('/api/warnings');
  var list = j.users || [];
  var el = document.getElementById('warnOut');
  if (!list.length) {
    el.innerHTML = '<p class="muted">No warnings stored.</p>';
    return;
  }
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var u = list[i];
    html +=
      '<div class="list-item">' +
      '<strong>User ' +
      escapeHtml(u.userId) +
      '</strong>' +
      '<div class="meta">' +
      escapeHtml(u.count) +
      ' warning(s)</div>' +
      '<div class="meta">' +
      escapeHtml((u.lastReason || '').slice(0, 120)) +
      '</div>' +
      '</div>';
  }
  el.innerHTML = html;
}

document.getElementById('menuBtn').onclick = openMenu;
document.getElementById('scrim').onclick = closeMenu;
document.querySelector('.side-nav').onclick = function (e) {
  var b = e.target.closest('button[data-tab]');
  if (b) tab(b.getAttribute('data-tab'));
};

document.getElementById('btnStock').onclick = function () {
  refreshStock();
};
document.getElementById('btnGenRefresh').onclick = function () {
  refreshStock();
};
document.getElementById('btnGwRefresh').onclick = function () {
  loadGiveaways();
};
document.getElementById('btnWarnRefresh').onclick = function () {
  loadWarnings();
};

document.getElementById('btnGenAdd').onclick = async function () {
  try {
    var j = await api('/api/genadd', {
      method: 'POST',
      body: JSON.stringify({
        product: document.getElementById('genProd').value,
        lines: document.getElementById('genLines').value
      })
    });
    document.getElementById('genMsg').innerHTML =
      '<span class="ok">+' + j.added + ' (total ' + j.total + ')</span>';
    document.getElementById('genLines').value = '';
    refreshStock();
  } catch (e) {
    document.getElementById('genMsg').textContent = e.message;
  }
};

document.getElementById('btnPayAdd').onclick = async function () {
  try {
    var j = await api('/api/payadd', {
      method: 'POST',
      body: JSON.stringify({
        product: document.getElementById('payProd').value,
        lines: document.getElementById('payLines').value
      })
    });
    document.getElementById('payMsg').innerHTML =
      '<span class="ok">+' + j.added + ' (total ' + j.total + ')</span>';
    document.getElementById('payLines').value = '';
    refreshStock();
  } catch (e) {
    document.getElementById('payMsg').textContent = e.message;
  }
};

document.getElementById('methodsOut').onclick = async function (e) {
  var save = e.target.closest('.btn-save-m');
  var clear = e.target.closest('.btn-clear-m');
  var btn = save || clear;
  if (!btn) return;
  var key = btn.getAttribute('data-key');
  if (!key) return;
  var ta = document.getElementById('m-' + key);
  var msg = document.getElementById('mm-' + key);
  try {
    if (clear) ta.value = '';
    await api('/api/methods', {
      method: 'POST',
      body: JSON.stringify({ product: key, text: ta.value })
    });
    msg.innerHTML = '<span class="ok">Saved</span>';
    loadOverview();
  } catch (err) {
    msg.textContent = err.message;
  }
};

document.getElementById('btnEco').onclick = async function () {
  try {
    await api('/api/economy', {
      method: 'POST',
      body: JSON.stringify({
        userId: document.getElementById('ecoUser').value.trim(),
        coins: Number(document.getElementById('ecoCoins').value || 0)
      })
    });
    document.getElementById('ecoMsg').innerHTML = '<span class="ok">Saved</span>';
  } catch (e) {
    document.getElementById('ecoMsg').textContent = e.message;
  }
};

document.getElementById('btnBlur').onclick = function () {
  document.documentElement.style.setProperty(
    '--blur',
    (document.getElementById('blur').value || 1) + 'px'
  );
};

document.getElementById('btnExport').onclick = async function () {
  var r = await fetch('/api/export', { credentials: 'same-origin' });
  if (r.status === 401) return alert('Login required');
  var blob = await r.blob();
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'flare-full-export.json';
  a.click();
  URL.revokeObjectURL(url);
};

document.getElementById('btnImport').onclick = async function () {
  var f = document.getElementById('importFile').files[0];
  if (!f) {
    document.getElementById('backupMsg').textContent = 'Choose a JSON file first';
    return;
  }
  try {
    var text = await f.text();
    var j = await api('/api/import', { method: 'POST', body: text });
    document.getElementById('backupMsg').innerHTML =
      '<span class="ok">Imported ' + (j.keys || '') + ' keys</span>';
    refreshStock();
    loadOverview();
  } catch (e) {
    document.getElementById('backupMsg').textContent = e.message;
  }
};

var gateBtn = document.getElementById('gateLoginBtn');
if (gateBtn) gateBtn.addEventListener('click', function () { doPasswordLogin(); });
var gatePw = document.getElementById('gatePassword');
if (gatePw) gatePw.addEventListener('keydown', function (e) { if (e.key === 'Enter') doPasswordLogin(); });
boot().catch(function () {});


/* ===== Protection / Invites / Moderation ===== */
async function loadProtection() {
  const msg = document.getElementById('protMsg');
  try {
    const r = await api('/api/protection');
    const p = r.protection || {};
    document.getElementById('protAutomod').checked = !!p.automod;
    document.getElementById('protAntinuke').checked = !!p.antinuke;
    document.getElementById('protAntiraid').checked = p.antiraid !== false;
    document.getElementById('protLog').value = p.logChannelId || '';
    document.getElementById('protSpamCount').value = p.spamMsgLimit ?? 6;
    document.getElementById('protSpamSecs').value = Math.round((p.spamWindowMs || 5000) / 1000);
    document.getElementById('protJoinCount').value = p.joinRaidLimit ?? 8;
    document.getElementById('protJoinSecs').value = Math.round((p.joinRaidWindowMs || 15000) / 1000);
    document.getElementById('protNukeCount').value = p.nukeActionLimit ?? 3;
    document.getElementById('protNukeSecs').value = Math.round((p.nukeWindowMs || 20000) / 1000);
    document.getElementById('protBadWords').value = (p.badWords || []).join(', ');
    if (msg) msg.textContent = 'Loaded.';
  } catch (e) {
    if (msg) msg.textContent = 'Failed to load protection.';
  }
}

async function saveProtection() {
  const msg = document.getElementById('protMsg');
  const bad = (document.getElementById('protBadWords').value || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const body = {
    automod: document.getElementById('protAutomod').checked,
    antinuke: document.getElementById('protAntinuke').checked,
    antiraid: document.getElementById('protAntiraid').checked,
    logChannelId: (document.getElementById('protLog').value || '').trim(),
    spamMsgLimit: parseInt(document.getElementById('protSpamCount').value, 10) || 6,
    spamWindowMs: (parseInt(document.getElementById('protSpamSecs').value, 10) || 5) * 1000,
    joinRaidLimit: parseInt(document.getElementById('protJoinCount').value, 10) || 8,
    joinRaidWindowMs: (parseInt(document.getElementById('protJoinSecs').value, 10) || 15) * 1000,
    nukeActionLimit: parseInt(document.getElementById('protNukeCount').value, 10) || 3,
    nukeWindowMs: (parseInt(document.getElementById('protNukeSecs').value, 10) || 20) * 1000,
    badWords: bad
  };
  try {
    await api('/api/protection', { method: 'POST', body: JSON.stringify(body) });
    if (msg) msg.textContent = 'Saved.';
  } catch (e) {
    if (msg) msg.textContent = 'Save failed.';
  }
}

async function loadInvitesDash() {
  const el = document.getElementById('invitesOut');
  if (!el) return;
  try {
    const r = await api('/api/invites');
    const rows = r.top || [];
    if (!rows.length) {
      el.innerHTML = '<p class="muted">No invite data yet. Tracking starts when members join with invites.</p>';
      return;
    }
    el.innerHTML =
      '<table class="table"><thead><tr><th>#</th><th>User</th><th>Total</th><th>Joins</th><th>Leaves</th><th>Bonus</th></tr></thead><tbody>' +
      rows
        .map(
          (x, i) =>
            `<tr><td>${i + 1}</td><td>${escapeHtml(x.name || x.id)}</td><td><b>${x.total}</b></td><td>${x.joins}</td><td>${x.leaves}</td><td>${x.bonus}</td></tr>`
        )
        .join('') +
      '</tbody></table>';
  } catch (e) {
    el.innerHTML = '<p class="muted">Could not load invites (API).</p>';
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

document.getElementById('btnProtSave')?.addEventListener('click', saveProtection);
document.getElementById('btnInvitesRefresh')?.addEventListener('click', loadInvitesDash);
document.getElementById('btnModWarn')?.addEventListener('click', () => {
  if (typeof loadWarnings === 'function') loadWarnings();
  else {
    const el = document.getElementById('modOut');
    if (el) el.innerHTML = '<p class="muted">Open Warnings tab or refresh after deploy.</p>';
  }
});

/* hook tab switches */
(function hookTabs() {
  const orig = window.showTab || window.switchTab;
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-tab');
      if (t === 'protection') loadProtection();
      if (t === 'invites') loadInvitesDash();
      if (t === 'moderation') {
        const el = document.getElementById('modOut');
        if (el && typeof loadWarnings === 'function') {
          // reuse warnings into modOut if possible
          api('/api/warnings')
            .then((r) => {
              const users = r.users || r.warnings || [];
              if (!users.length) {
                el.innerHTML = '<p class="muted">No warnings stored.</p>';
                return;
              }
              el.innerHTML = users
                .slice(0, 30)
                .map((u) => `<div class="card"><b>${escapeHtml(u.userId)}</b> — ${u.count || 0} warn(s)</div>`)
                .join('');
            })
            .catch(() => {
              el.innerHTML = '<p class="muted">No warnings API data.</p>';
            });
        }
      }
    });
  });
})();
