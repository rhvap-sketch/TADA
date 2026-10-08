const DB = (() => {
  const KEYS = {
    USERS: 'vts.users',
    SESSION: 'vts.session',
    LOGBOOKS: 'vts.logbooks',
    TADA: 'vts.tada',
    VEHICLES: 'vts.vehicles',
    DRIVERS: 'vts.drivers',
    ORG: 'vts.org',
    SEQUENCES: 'vts.sequences',
    AUDIT: 'vts.audit',
    MACHINERY_NAMES: 'vts.machineryNames',
  };

  const SESSION_HOURS = 12;

  const read = function(k, f) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : (f === undefined ? null : f); }
    catch (e) { return f === undefined ? null : f; }
  };
  const write = function(k, v) { localStorage.setItem(k, JSON.stringify(v)); };
  const uid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

  function randomHex(bytes) {
    var arr = new Uint8Array(bytes || 16);
    crypto.getRandomValues(arr);
    return Array.from(arr, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function hashPassword(password, salt) {
    var enc = new TextEncoder();
    var data = enc.encode(salt + ':' + password);
    var buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf), function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function nextSequence(kind, year) {
    var seq = read(KEYS.SEQUENCES, {});
    var key = (kind === 'USER') ? 'USER' : (kind + '-' + year);
    var n = (seq[key] || 0) + 1;
    seq[key] = n;
    write(KEYS.SEQUENCES, seq);
    if (kind === 'USER') return { raw: n, formatted: 'RHVAP-' + String(n).padStart(5, '0') };
    return { raw: n, formatted: kind + '-' + year + '-' + String(n).padStart(5, '0') };
  }

  function seedSync() {
    if (!read(KEYS.USERS)) write(KEYS.USERS, []);
    if (!read(KEYS.DRIVERS)) {
      write(KEYS.DRIVERS, [
        { id: uid(), name: 'कुन्दन प्रसाद पाण्डेय', level: 'अधिकृत', position: 'POs Strengthening Officer', active: true },
        { id: uid(), name: 'गणेश प्रसाद बोहरा',   level: 'अधिकृत', position: 'Rural Finance Officer',           active: true },
        { id: uid(), name: 'तारणी प्रसाद जोशी',    level: 'अधिकृत', position: 'Fund and Finance management Officer', active: true },
        { id: uid(), name: 'नृपराज जोशी',          level: 'अधिकृत', position: 'Agroecology crop officer',        active: true },
        { id: uid(), name: 'मिजाश मल्ल',            level: 'अधिकृत', position: 'Procurement Officer',             active: true },
        { id: uid(), name: 'मिलन कँडेल',            level: 'अधिकृत', position: 'Business Development Officer',    active: true },
        { id: uid(), name: 'राजेन्द्र बम',          level: 'अधिकृत', position: 'MEAL Officer',                    active: true },
        { id: uid(), name: 'रोहित राज भण्डारी',     level: 'अधिकृत', position: 'Engineer',                        active: true },
        { id: uid(), name: 'संजय कुमार पंडित',      level: 'अधिकृत', position: 'Agroecology Livestock officer',   active: true },
        { id: uid(), name: 'हरि प्रसाद बोहरा',      level: 'अधिकृत', position: 'MIS & Data Management Officer',   active: true },
      ]);
    }
    if (!read(KEYS.VEHICLES)) {
      var nums = ['सु प प्र ०४-००१-ब ०१६७','सु प प्र ०४-००१-ब ०१६८','सु प प्र ०४-००१-ब ०१६९',
                  'सु प प्र ०४-००१-ब ०१७०','सु प प्र ०४-००१-ब ०१७१','सु प प्र ०४-००१-ब ०१७२',
                  'सु प प्र ०४-००१-ब ०१७३','सु प प्र ०४-००१-ब ०१७४','सु प प्र ०२-००१-झ १४८'];
      var types = ['मोटरसाईकल','स्कोर्पियो','बोलेरो','भाडाको'];
      write(KEYS.VEHICLES, nums.map(function(n, i) {
        return { id: uid(), number: n, name: types[i % types.length], active: true };
      }));
    }
    if (!read(KEYS.ORG)) {
      write(KEYS.ORG, {
        province: 'सुदूरपश्चिम प्रदेश सरकार',
        ministry: 'भूमि व्यवस्था, कृषि तथा सहकारी मन्त्रालय',
        program: 'उच्च मूल्य कृषिवस्तु उत्थानशील कार्यक्रम, डडेल्धुरा',
        office: 'उच्च मूल्य कृषिवस्तु उत्थानशील कार्यक्रम  डडेल्धुरा',
        officeCode: '3120175037',
        address: 'डडेल्धुरा, सुदूरपश्चिम प्रदेश',
      });
    }
    if (!read(KEYS.MACHINERY_NAMES)) write(KEYS.MACHINERY_NAMES, ['मोटरसाईकल', 'स्कोर्पियो', 'बोलेरो', 'भाडाको']);
    if (!read(KEYS.SEQUENCES)) write(KEYS.SEQUENCES, {});
    if (!read(KEYS.AUDIT)) write(KEYS.AUDIT, []);
    if (!read(KEYS.LOGBOOKS)) write(KEYS.LOGBOOKS, []);
    if (!read(KEYS.TADA)) write(KEYS.TADA, []);
  }

  async function init() { seedSync(); }

  function audit(action, opts) {
    opts = opts || {};
    var logs = read(KEYS.AUDIT, []);
    var s = read(KEYS.SESSION);
    var u = s ? findUserById(s.userId) : null;
    var entry = Object.assign({
      id: uid(),
      userEmail: (u && u.email) || 'anonymous',
      userId: (u && u.userId) || null,
      action: action,
      createdAt: new Date().toISOString(),
    }, opts);
    logs.push(entry);
    write(KEYS.AUDIT, logs.slice(-1000));
  }

  function getUsers() { return read(KEYS.USERS, []); }
  function setUsers(v) { write(KEYS.USERS, v); }
  function findUserByEmail(email) {
    return getUsers().find(function(u) { return u.email.toLowerCase() === String(email).toLowerCase(); });
  }
  function findUserById(id) { return getUsers().find(function(u) { return u.id === id; }); }
  function findUserByUserId(userId) { return getUsers().find(function(u) { return u.userId === userId; }); }

  async function register(params) {
    var name = params.name, email = params.email, password = params.password;
    if (!name || !email || !password) throw new Error('सबै फिल्ड भर्नुहोस्');
    if (password.length < 6) throw new Error('पासवर्ड कम्तीमा ६ अक्षर');
    if (findUserByEmail(email)) throw new Error('यो इमेल पहिले नै दर्ता भइसकेको छ');

    var users = getUsers();
    var isFirst = users.length === 0;
    var salt = randomHex(16);
    var passwordHash = await hashPassword(password, salt);
    var seq = nextSequence('USER');

    var user = {
      id: uid(),
      userId: seq.formatted,
      name: name,
      email: email.toLowerCase(),
      role: isFirst ? 'ADMIN' : 'USER',
      active: true,
      salt: salt,
      passwordHash: passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    setUsers(users);
    audit('USER_REGISTERED', { meta: { email: email, userId: user.userId } });
    return user;
  }

  async function login(params) {
    var user = findUserByEmail(params.email);
    if (!user) throw new Error('इमेल वा पासवर्ड मिलेन');
    if (!user.active) throw new Error('यो खाता निष्क्रिय छ। एडमिनलाई सम्पर्क गर्नुहोस्');
    var hash = await hashPassword(params.password, user.salt || '');
    if (hash !== user.passwordHash) throw new Error('इमेल वा पासवर्ड मिलेन');

    var session = {
      userId: user.id,
      token: randomHex(24),
      expiresAt: Date.now() + SESSION_HOURS * 3600 * 1000,
    };
    write(KEYS.SESSION, session);
    audit('USER_LOGIN', { meta: { email: user.email, userId: user.userId } });
    return user;
  }

  function logout() {
    audit('USER_LOGOUT', {});
    localStorage.removeItem(KEYS.SESSION);
  }

  function currentUser() {
    var s = read(KEYS.SESSION);
    if (!s) return null;
    if (Date.now() > s.expiresAt) { localStorage.removeItem(KEYS.SESSION); return null; }
    var u = findUserById(s.userId);
    if (!u || !u.active) return null;
    return u;
  }
  function currentUserId() { var u = currentUser(); return u ? u.userId : null; }

  async function changePassword(userId, oldPassword, newPassword) {
    var users = getUsers();
    var idx = users.findIndex(function(u) { return u.id === userId; });
    if (idx === -1) throw new Error('प्रयोगकर्ता भेटिएन');
    var u = users[idx];
    var oldHash = await hashPassword(oldPassword, u.salt || '');
    if (oldHash !== u.passwordHash) throw new Error('पुरानो पासवर्ड मिलेन');
    if (newPassword.length < 6) throw new Error('नयाँ पासवर्ड कम्तीमा ६ अक्षर');
    var salt = randomHex(16);
    var passwordHash = await hashPassword(newPassword, salt);
    users[idx] = Object.assign({}, u, { salt: salt, passwordHash: passwordHash });
    setUsers(users);
    audit('PASSWORD_CHANGED', { meta: { userId: u.userId } });
    return true;
  }

  async function adminResetPassword(userId, newPassword) {
    var me = currentUser();
    if (!me || me.role !== 'ADMIN') throw new Error('केवल एडमिन');
    if (newPassword.length < 6) throw new Error('कम्तीमा ६ अक्षर');
    var users = getUsers();
    var idx = users.findIndex(function(u) { return u.id === userId; });
    if (idx === -1) throw new Error('प्रयोगकर्ता भेटिएन');
    var salt = randomHex(16);
    var passwordHash = await hashPassword(newPassword, salt);
    users[idx] = Object.assign({}, users[idx], { salt: salt, passwordHash: passwordHash });
    setUsers(users);
    audit('PASSWORD_RESET_BY_ADMIN', { meta: { targetUserId: users[idx].userId } });
    return true;
  }

  function setRole(userId, role) {
    var users = getUsers().map(function(u) { return u.id === userId ? Object.assign({}, u, { role: role }) : u; });
    setUsers(users);
    audit('USER_ROLE_CHANGED', { meta: { userId: userId, role: role } });
  }

  function setActive(userId, active) {
    var users = getUsers().map(function(u) { return u.id === userId ? Object.assign({}, u, { active: active }) : u; });
    setUsers(users);
    audit('USER_ACTIVE_CHANGED', { meta: { userId: userId, active: active } });
  }

  function getLogbooks() { return read(KEYS.LOGBOOKS, []); }
  function setLogbooks(v) { write(KEYS.LOGBOOKS, v); }
  function getTada() { return read(KEYS.TADA, []); }
  function setTada(v) { write(KEYS.TADA, v); }
  function findLogbookById(id) { return getLogbooks().find(function(x) { return x.id === id; }); }
  function findTadaById(id) { return getTada().find(function(x) { return x.id === id; }); }

  function decide(docType, id, decision, opts) {
    opts = opts || {};
    var reason = opts.reason || '';

    var admin = currentUser();
    if (!admin || admin.role !== 'ADMIN') throw new Error('केवल एडमिनले स्वीकृत/अस्वीकृत गर्न सक्नुहुन्छ');

    var list = (docType === 'LOGBOOK') ? getLogbooks() : getTada();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { idx = i; break; }
    }
    if (idx === -1) throw new Error('रेकर्ड भेटिएन');

    var rec = Object.assign({}, list[idx]);

    var nowAd = new Date();
    var nowBs = null;
    try {
      if (typeof NepaliDate !== 'undefined' && NepaliDate.adToBs) {
        var bs = NepaliDate.adToBs(nowAd);
        if (bs) {
          nowBs = bs.y + '/' + String(bs.m).padStart(2, '0') + '/' + String(bs.d).padStart(2, '0');
        }
      }
    } catch (e) { console.error('[decide] BS conversion failed:', e); }

    if (decision === 'APPROVED') {
      var year = nowBs ? parseInt(nowBs.split('/')[0], 10) : new Date().getFullYear();
      if (docType === 'LOGBOOK' && !rec.approvedRecordNumber) {
        rec.approvedRecordNumber = nextSequence('LOG', year).formatted;
      }
      if (docType === 'TADA' && !rec.approvedOrderNumber) {
        rec.approvedOrderNumber = nextSequence('TADA', year).formatted;
      }
    }

    rec.status = decision;
    rec.approvedByUserId = admin.userId;
    rec.approvedByName = admin.name;
    rec.approvedAt = nowAd.toISOString();
    rec.approvedAtBs = nowBs;
    rec.rejectionReason = (decision === 'REJECTED') ? reason : '';

    list[idx] = rec;
    if (docType === 'LOGBOOK') setLogbooks(list); else setTada(list);

    var auditId = rec.approvedRecordNumber || rec.approvedOrderNumber || rec.draftId || '';
    audit(decision === 'APPROVED' ? (docType + '_APPROVED') : (docType + '_REJECTED'), {
      docType: docType,
      recordId: auditId,
      meta: { reason: reason, approvedAtBs: nowBs },
    });
    return rec;
  }

  function resubmit(docType, id, patch) {
    var u = currentUser();
    var list = (docType === 'LOGBOOK') ? getLogbooks() : getTada();
    var idx = list.findIndex(function(x) { return x.id === id; });
    if (idx === -1) throw new Error('रेकर्ड भेटिएन');
    if (list[idx].createdByUserId !== u.userId && u.role !== 'ADMIN')
      throw new Error('तपाईंको रेकर्ड होइन');
    list[idx] = Object.assign({}, list[idx], patch, {
      status: 'PENDING',
      approvedByUserId: null, approvedByName: null, approvedAt: null, approvedAtBs: null,
      rejectionReason: '',
      updatedAt: new Date().toISOString(),
    });
    if (docType === 'LOGBOOK') setLogbooks(list); else setTada(list);
    audit(docType + '_RESUBMITTED', { docType: docType });
    return list[idx];
  }

  // ─────────────────────────────────────────────────────────
  // ADMIN-ONLY: Full factory reset
  // Clears every vts.* key and re-seeds defaults.
  // Requires an ADMIN session. Otherwise throws.
  // ─────────────────────────────────────────────────────────
  function resetAll() {
    var me = currentUser();
    if (!me || me.role !== 'ADMIN') {
      throw new Error('केवल एडमिनले मात्र रिसेट गर्न सक्नुहुन्छ');
    }
    Object.keys(KEYS).forEach(function(k) {
      localStorage.removeItem(KEYS[k]);
    });
    seedSync();
    audit('SYSTEM_RESET', { meta: { byUserId: me.userId } });
    return true;
  }

  return {
    KEYS: KEYS, uid: uid, init: init, audit: audit, nextSequence: nextSequence,
    get: read, set: write,

    getUsers: getUsers, setUsers: setUsers,
    findUserByEmail: findUserByEmail, findUserById: findUserById, findUserByUserId: findUserByUserId,
    register: register, login: login, logout: logout,
    currentUser: currentUser, currentUserId: currentUserId,
    changePassword: changePassword, adminResetPassword: adminResetPassword,
    setRole: setRole, setActive: setActive,

    getVehicles: function() { return read(KEYS.VEHICLES, []); },
    setVehicles: function(v) { write(KEYS.VEHICLES, v); },
    getDrivers: function() { return read(KEYS.DRIVERS, []); },
    setDrivers: function(v) { write(KEYS.DRIVERS, v); },
    getMachineryNames: function() { return read(KEYS.MACHINERY_NAMES, []); },
    setMachineryNames: function(v) { write(KEYS.MACHINERY_NAMES, v); },
    getOrg: function() { return read(KEYS.ORG, {}); },
    setOrg: function(v) { write(KEYS.ORG, v); },

    getLogbooks: getLogbooks, setLogbooks: setLogbooks, findLogbookById: findLogbookById,
    getTada: getTada, setTada: setTada, findTadaById: findTadaById,

    decide: decide, resubmit: resubmit,

    getAudit: function() { return read(KEYS.AUDIT, []); },
    nextNumber: function(docType, year) { return nextSequence(docType, year); },

    resetAll: resetAll,
  };
})();

DB.init();