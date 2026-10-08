// ─────────────────────────────────────────────────────────────
// भ्रमण आदेश (Travel Order) — preview + print + BS pickers + auth
// ─────────────────────────────────────────────────────────────

let currentPreviewData = null;

function initTada() {
  console.log('[tada] initTada() called');

  const drivers = DB.getDrivers();
  const sel = document.getElementById('employeeId');
  if (!sel) { console.error('employeeId not found'); return; }

  sel.innerHTML = '<option value="">-- छान्नुहोस् --</option>';
  drivers.filter(function(d) { return d.active; }).forEach(function(d) {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    opt.dataset.position = d.position || '';
    sel.appendChild(opt);
  });

  sel.addEventListener('change', function() {
    const p = document.getElementById('position');
    if (p) p.value = sel.selectedOptions[0] ? (sel.selectedOptions[0].dataset.position || '') : '';
  });

  const org = DB.getOrg();
  const oc = document.getElementById('officeCode');
  const of = document.getElementById('office');
  if (oc) oc.value = org.officeCode || '';
  if (of) of.value = org.office || '';

  if (typeof BsDatePicker !== 'undefined') {
    BsDatePicker.attach('orderDateBs');
    BsDatePicker.attach('startBs');
    BsDatePicker.attach('endBs');
  }
}

// ── Duration — shows exactly what's wrong ────────────────────
function recalcDuration() {
  var s = document.getElementById('startBs').value.trim();
  var e = document.getElementById('endBs').value.trim();
  var out = document.getElementById('duration');
  if (!out) return;

  if (!s || !e) {
    out.value = '';
    out.style.color = '';
    return;
  }

  var re = /^\d{4}\/\d{2}\/\d{2}$/;
  if (!re.test(s)) { out.value = 'सुरु मिति अपूर्ण'; out.style.color = '#dc2626'; return; }
  if (!re.test(e)) { out.value = 'अन्त्य मिति अपूर्ण'; out.style.color = '#dc2626'; return; }

  var yS = parseInt(s.split('/')[0], 10);
  var yE = parseInt(e.split('/')[0], 10);
  if (!NepaliDate.isValidYear(yS)) { out.value = 'सुरु वर्ष मान्य छैन'; out.style.color = '#dc2626'; return; }
  if (!NepaliDate.isValidYear(yE)) { out.value = 'अन्त्य वर्ष मान्य छैन'; out.style.color = '#dc2626'; return; }

  var a = NepaliDate.bsToAd(s);
  var b = NepaliDate.bsToAd(e);
  if (!a) { out.value = 'सुरु मिति अवैध'; out.style.color = '#dc2626'; return; }
  if (!b) { out.value = 'अन्त्य मिति अवैध'; out.style.color = '#dc2626'; return; }

  var days = Math.floor((b - a) / 86400000) + 1;
  if (days < 1) { out.value = 'अन्त्य मिति सुरु भन्दा अघि'; out.style.color = '#dc2626'; return; }

  out.value = days + ' दिन';
  out.style.color = '#16a34a';
}

function collectTada() {
  var empId = document.getElementById('employeeId').value;
  var emp = DB.getDrivers().find(function(d) { return d.id === empId; });
  if (!emp) throw new Error('कर्मचारी छान्नुहोस्');

  var orderDateBs = document.getElementById('orderDateBs').value.trim();
  var startBs = document.getElementById('startBs').value.trim();
  var endBs = document.getElementById('endBs').value.trim();
  var destination = document.getElementById('destination').value.trim();
  var purpose = document.getElementById('purpose').value.trim();

  if (!orderDateBs) throw new Error('आदेश मिति आवश्यक');
  if (!startBs || !endBs) throw new Error('भ्रमण मिति आवश्यक');
  if (!destination) throw new Error('भ्रमण स्थान आवश्यक');
  if (!purpose) throw new Error('भ्रमणको उद्देश्य आवश्यक');

  var bsRe = /^\d{4}\/\d{2}\/\d{2}$/;
  if (!bsRe.test(orderDateBs)) throw new Error('आदेश मिति ढाँचा मिलेन (YYYY/MM/DD)');
  if (!bsRe.test(startBs)) throw new Error('सुरु मिति ढाँचा मिलेन (YYYY/MM/DD)');
  if (!bsRe.test(endBs)) throw new Error('अन्त्य मिति ढाँचा मिलेन (YYYY/MM/DD)');

  var y1 = parseInt(orderDateBs.split('/')[0], 10);
  var y2 = parseInt(startBs.split('/')[0], 10);
  var y3 = parseInt(endBs.split('/')[0], 10);
  if (!NepaliDate.isValidYear(y1)) throw new Error('आदेश मिति वर्ष मान्य छैन');
  if (!NepaliDate.isValidYear(y2)) throw new Error('सुरु मिति वर्ष मान्य छैन');
  if (!NepaliDate.isValidYear(y3)) throw new Error('अन्त्य मिति वर्ष मान्य छैन');

  var days = NepaliDate.durationDays(startBs, endBs);
  if (days < 1) throw new Error('अन्त्य मिति सुरु भन्दा पछि हुनुपर्छ');

  return {
    travelType: document.getElementById('travelType').value,
    orderDateBs: orderDateBs,
    employeeName: emp.name,
    position: emp.position,
    office: document.getElementById('office').value,
    destination: destination,
    purpose: purpose,
    startBs: startBs,
    endBs: endBs,
    durationDays: days,
    transportOffice: document.getElementById('transportOffice').checked,
    transportPublic: document.getElementById('transportPublic').checked,
    transportHired:  document.getElementById('transportHired').checked,
    advanceAmount: parseFloat(document.getElementById('advanceAmount').value) || 0,
    otherDetails: document.getElementById('otherDetails').value.trim(),
    officeCode: document.getElementById('officeCode').value,
  };
}

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function(ch) {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

function watermarkHtml(status) {
  if (status === 'APPROVED') return '';
  var label = (status === 'REJECTED') ? 'अस्वीकृत' : 'प्रतिक्षामा';
  var color = (status === 'REJECTED') ? '#dc2626' : '#d97706';
  return '<div style="text-align:center;margin-bottom:8px">' +
    '<span style="display:inline-block;padding:4px 14px;border:2px solid ' + color +
    ';color:' + color + ';font-weight:700;border-radius:6px;font-size:12px;letter-spacing:2px">' +
    label + '</span></div>';
}

function buildTadaPreview(data, displayNumber, status) {
  var org = DB.getOrg();
  var me = (typeof App !== 'undefined' && App.currentUser) ? App.currentUser() : null;
  status = status || 'PENDING';

  var tOffice = data.transportOffice ? '☑' : '☐';
  var tPublic = data.transportPublic ? '☑' : '☐';
  var tHired  = data.transportHired  ? '☑' : '☐';

  var numberLabel = (status === 'APPROVED') ? esc(displayNumber) : 'मस्यौदा (Draft)';
  var orderNoLine = (status === 'APPROVED')
    ? 'आदेश नं: ' + esc(displayNumber)
    : 'आदेश नं: मस्यौदा (Draft)';

  var orderDateStr = toDevanagariDate(data.orderDateBs);
  var startStr = toDevanagariDate(data.startBs);
  var endStr = toDevanagariDate(data.endBs);
  var durStr = toDevanagari(data.durationDays);

  var meLine = me ? '<br>बनाउने: ' + esc(me.name) + ' (' + esc(me.userId) + ')' : '';

  return watermarkHtml(status) +
    '<div style="text-align:center;margin-bottom:6px">' +
      '<img src="assets/img/nepal-emblem.png" alt="Nepal Emblem" style="width:60px;height:60px;object-fit:contain;display:inline-block">' +
    '</div>' +
    '<div class="header-line title">' + esc(org.province || 'सुदूरपश्चिम प्रदेश सरकार') + '</div>' +
    '<div class="header-line sub">' + esc(org.ministry || 'भूमि व्यवस्था, कृषि तथा सहकारी मन्त्रालय') + '</div>' +
    '<div class="header-line sub">' + esc(org.program || 'उच्च मूल्य कृषिवस्तु उत्थानशील कार्यक्रम, डडेल्धुरा') + '</div>' +
    '<div class="header-line sub">कार्यालय कोड नं.: ' + esc(data.officeCode) + '</div>' +
    '<div class="section-title">' + esc(data.travelType) + ' भ्रमण आदेश</div>' +
    '<div class="order-header">' +
      '<div></div>' +
      '<div class="right">' +
        '<div><b>' + orderNoLine + '</b></div>' +
        '<div style="margin-top:5px"><b>मिति:</b> ' + orderDateStr + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="field-row"><div class="label">भ्रमण गर्ने पदाधिकारी वा कर्मचारीको नाम:</div><div class="value">' + esc(data.employeeName) + '</div></div>' +
    '<div class="field-row"><div class="label">पद:</div><div class="value">' + esc(data.position) + '</div></div>' +
    '<div class="field-row"><div class="label">कार्यालय:</div><div class="value">' + esc(data.office) + '</div></div>' +
    '<div class="field-row"><div class="label">भ्रमण गर्ने स्थान (बिदेश भए मुलुक र शहर खुलाउने):</div><div class="value">' + esc(data.destination) + '</div></div>' +
    '<div class="field-row"><div class="label">भ्रमणको उद्देश्य:</div><div class="value">' + esc(data.purpose) + '</div></div>' +
    '<div class="field-row"><div class="label">भ्रमण गर्ने अवधि:</div><div class="value">' +
      startStr + ' देखी ' + endStr + ' सम्म (' + durStr + ' दिन)</div></div>' +
    '<div class="field-row"><div class="label">भ्रमण गर्ने साधन:</div><div class="value">' +
      tOffice + ' कार्यालयको &nbsp;&nbsp; ' + tPublic + ' सार्वजनिक &nbsp;&nbsp; ' + tHired + ' भाडाको</div></div>' +
    '<div class="field-row"><div class="label">भ्रमण निमित्त माग गरेको पेश्की रकम:</div><div class="value">' +
      (data.advanceAmount ? 'रु. ' + toDevanagari(data.advanceAmount.toFixed(2)) : '') + '</div></div>' +
    '<div class="field-row"><div class="label">भ्रमण सम्बन्धी अन्य आवश्यक विवरण:</div><div class="value">' + esc(data.otherDetails || '') + '</div></div>' +
    '<div class="signature-row">' +
      '<div class="signature-block"><div class="signature-line"></div><div><b>भ्रमण गर्ने पदाधिकारी</b></div><div style="margin-top:4px">मितिः ' + orderDateStr + '</div></div>' +
      '<div class="signature-block"><div class="signature-line"></div><div><b>सिफारिस गर्ने</b></div><div style="margin-top:4px">मितिः ' + orderDateStr + '</div></div>' +
      '<div class="signature-block"><div class="signature-line"></div><div><b>भ्रमण स्वीकृत गर्ने पदाधिकारी</b></div><div style="margin-top:4px">मितिः ' + orderDateStr + '</div></div>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<div class="admin-section">' +
      '<h4>प्रशासन शाखाले भर्ने</h4>' +
      '<div style="display:flex; justify-content:space-between; margin-top:8px">' +
        '<div><b>हाजिरी खातामा जनाएको मिति:</b> ___________________</div>' +
        '<div><b>जनाउने कर्मचारीको दस्तखत:</b> ___________________</div>' +
      '</div>' +
    '</div>' +
    '<div style="margin-top:18px; text-align:center; font-size:10px; color:#555">' +
      'आदेश नं: ' + numberLabel + ' — मिति: ' + orderDateStr + meLine +
    '</div>';
}

function savePendingTada(data) {
  var u = App.currentUser();
  var all = DB.getTada();
  var rec = {
    id: DB.uid(),
    draftId: 'DRAFT-' + Date.now().toString(36).toUpperCase(),
    travelType: data.travelType,
    orderDateBs: data.orderDateBs,
    employeeName: data.employeeName,
    position: data.position,
    office: data.office,
    destination: data.destination,
    purpose: data.purpose,
    startBs: data.startBs,
    endBs: data.endBs,
    durationDays: data.durationDays,
    transportOffice: data.transportOffice,
    transportPublic: data.transportPublic,
    transportHired: data.transportHired,
    advanceAmount: data.advanceAmount,
    otherDetails: data.otherDetails,
    officeCode: data.officeCode,
    createdByUserId: u.userId,
    createdByName: u.name,
    createdByEmail: u.email,
    userEmail: u.email,
    createdAt: new Date().toISOString(),
    createdAtBs: NepaliDate.todayBs(),
    status: 'PENDING',
    approvedOrderNumber: null,
  };
  all.push(rec);
  DB.setTada(all);
  DB.audit('TADA_CREATED', { docType: 'TADA', recordId: rec.draftId });
  return rec;
}

function previewTada() {
  try {
    console.log('[tada] previewTada() called');
    var data = collectTada();
    var draftLabel = 'DRAFT-' + Date.now().toString(36).toUpperCase();

    currentPreviewData = { data: data, recordNumber: draftLabel, status: 'PENDING' };

    var html = buildTadaPreview(data, draftLabel, 'PENDING');
    var area = document.getElementById('printArea');
    if (!area) { alert('❌ printArea element missing'); return; }
    area.innerHTML = html;

    var recNo = document.getElementById('previewRecordNo');
    if (recNo) recNo.textContent = 'प्रतिक्षामा — मस्यौदा (Pending — Draft)';

    document.getElementById('previewModal').classList.remove('hidden');
    savePendingTada(data);
    App.toast('✅ पूर्वावलोकन तयार — स्वीकृतिको लागि पठाइयो', 'success');
  } catch (e) {
    console.error('[tada] preview error:', e);
    App.toast('❌ ' + e.message, 'error');
  }
}

function printPreview() {
  if (!currentPreviewData) { App.toast('पहिले पूर्वावलोकन खोल्नुहोस्', 'warn'); return; }
  window.print();
}

function closePreview() {
  document.getElementById('previewModal').classList.add('hidden');
  currentPreviewData = null;
}

async function downloadExcelFromPreview() {
  if (!currentPreviewData) return;
  try {
    var d = currentPreviewData;
    var buf = await ExcelGenerator.generateTada(d.data);
    ExcelGenerator.download(buf, d.recordNumber + '.xlsx');
    App.toast('✅ Excel डाउनलोड भयो', 'success');
  } catch (e) { App.toast('❌ ' + e.message, 'error'); }
}

async function downloadExcelOnly() {
  try {
    var data = collectTada();
    var draftLabel = 'DRAFT-' + Date.now().toString(36).toUpperCase();
    var buf = await ExcelGenerator.generateTada(data);
    ExcelGenerator.download(buf, draftLabel + '.xlsx');
    savePendingTada(data);
    App.toast('✅ Excel डाउनलोड भयो — स्वीकृतिको लागि पठाइयो', 'success');
  } catch (e) {
    console.error(e);
    App.toast('❌ ' + e.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// Shared print window for saved records
// ─────────────────────────────────────────────────────────────
function openTadaPrintWindow(t) {
  if (!t) return;
  var org = DB.getOrg();
  var status = t.status;
  var displayNum = (status === 'APPROVED' && t.approvedOrderNumber)
    ? t.approvedOrderNumber
    : (t.draftId || 'DRAFT');

  var watermark = (status === 'APPROVED') ? '' :
    '<div style="text-align:center;margin-bottom:8px">' +
      '<span style="display:inline-block;padding:4px 14px;border:2px solid ' +
      (status === 'REJECTED' ? '#dc2626' : '#d97706') + ';color:' +
      (status === 'REJECTED' ? '#dc2626' : '#d97706') +
      ';font-weight:700;border-radius:6px;font-size:12px;letter-spacing:2px">' +
      (status === 'REJECTED' ? 'अस्वीकृत' : 'प्रतिक्षामा') +
      '</span></div>';

  var tO = t.transportOffice ? '☑' : '☐';
  var tP = t.transportPublic ? '☑' : '☐';
  var tH = t.transportHired  ? '☑' : '☐';

  var numLabel = (status === 'APPROVED') ? esc(displayNum) : 'मस्यौदा (Draft)';
  var orderNoLine = (status === 'APPROVED')
    ? ('आदेश नं: ' + esc(displayNum))
    : 'आदेश नं: मस्यौदा (Draft)';

  var orderDateStr = toDevanagariDate(t.orderDateBs);
  var startStr = toDevanagariDate(t.startBs);
  var endStr = toDevanagariDate(t.endBs);
  var durStr = toDevanagari(t.durationDays);

  var approvedLine = '';
  if (t.status === 'APPROVED' && t.approvedByName) {
    approvedLine = '<br>स्वीकृत: ' + esc(t.approvedByName) + ' (' + esc(t.approvedByUserId) + ')' +
      (t.approvedAtBs ? ' — ' + toDevanagariDate(t.approvedAtBs) : '');
  }

  var css = [
    "body{font-family:'Noto Sans Devanagari','Mangal','Kalimati',Arial,sans-serif;padding:24px;color:#000;position:relative}",
    ".no-print{position:fixed;top:12px;right:12px;z-index:100}",
    ".no-print button{padding:10px 18px;font-size:14px;border-radius:8px;border:0;cursor:pointer;color:#fff;background:#15803d;font-weight:600}",
    ".no-print button:hover{background:#166534}",
    ".header-line{text-align:center}",
    ".header-line.title{font-size:16px;font-weight:700;margin-top:6px}",
    ".header-line.sub{font-size:13px}",
    ".section-title{text-align:center;font-size:15px;font-weight:700;margin:18px 0 10px;padding-bottom:5px;border-bottom:2px solid #000}",
    ".field-row{display:flex;margin:8px 0;font-size:12px}",
    ".field-row .label{font-weight:600;min-width:42%}",
    ".field-row .value{flex:1}",
    ".signature-row{display:flex;justify-content:space-between;margin-top:60px;font-size:12px}",
    ".signature-block{width:30%;text-align:center}",
    ".signature-line{border-top:1px solid #000;margin:40px 0 6px}",
    ".order-header{display:flex;justify-content:space-between;margin:14px 0;font-size:12px}",
    ".divider{border-top:2px dashed #000;margin:24px 0 12px}",
    ".admin-section{font-size:11px;background:#fafafa;padding:10px 14px;border:1px solid #999}",
    "@media print{.no-print{display:none!important}body{padding:0}@page{size:A4 portrait;margin:12mm}}"
  ].join('');

  var parts = [];
  parts.push('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(displayNum) + '</title>');
  parts.push('<style>' + css + '</style></head><body>');
  parts.push('<div class="no-print"><button onclick="window.print()">🖨️ प्रिन्ट / PDF सेभ</button></div>');
  parts.push(watermark);
  parts.push('<div style="text-align:center;margin-bottom:6px"><img src="assets/img/nepal-emblem.png" style="width:60px;height:60px;object-fit:contain;display:inline-block"></div>');
  parts.push('<div class="header-line title">' + esc(org.province || '') + '</div>');
  parts.push('<div class="header-line sub">' + esc(org.ministry || '') + '</div>');
  parts.push('<div class="header-line sub">' + esc(org.program || '') + '</div>');
  parts.push('<div class="header-line sub">कार्यालय कोड नं.: ' + esc(t.officeCode || '') + '</div>');
  parts.push('<div class="section-title">' + esc(t.travelType) + ' भ्रमण आदेश</div>');
  parts.push('<div class="order-header"><div></div><div style="text-align:right">');
  parts.push('<div><b>' + orderNoLine + '</b></div>');
  parts.push('<div style="margin-top:5px"><b>मिति:</b> ' + orderDateStr + '</div>');
  parts.push('</div></div>');
  parts.push('<div class="field-row"><div class="label">भ्रमण गर्ने पदाधिकारी/कर्मचारीको नाम:</div><div class="value">' + esc(t.employeeName) + '</div></div>');
  parts.push('<div class="field-row"><div class="label">पद:</div><div class="value">' + esc(t.position) + '</div></div>');
  parts.push('<div class="field-row"><div class="label">कार्यालय:</div><div class="value">' + esc(t.office) + '</div></div>');
  parts.push('<div class="field-row"><div class="label">भ्रमण गर्ने स्थान:</div><div class="value">' + esc(t.destination) + '</div></div>');
  parts.push('<div class="field-row"><div class="label">भ्रमणको उद्देश्य:</div><div class="value">' + esc(t.purpose) + '</div></div>');
  parts.push('<div class="field-row"><div class="label">भ्रमण गर्ने अवधि:</div><div class="value">' +
    startStr + ' देखी ' + endStr + ' सम्म (' + durStr + ' दिन)</div></div>');
  parts.push('<div class="field-row"><div class="label">भ्रमण गर्ने साधन:</div><div class="value">' +
    tO + ' कार्यालयको &nbsp; ' + tP + ' सार्वजनिक &nbsp; ' + tH + ' भाडाको</div></div>');
  parts.push('<div class="field-row"><div class="label">पेश्की रकम:</div><div class="value">' +
    (t.advanceAmount ? 'रु. ' + toDevanagari(t.advanceAmount.toFixed(2)) : '') + '</div></div>');
  parts.push('<div class="field-row"><div class="label">अन्य विवरण:</div><div class="value">' + esc(t.otherDetails || '') + '</div></div>');
  parts.push('<div class="signature-row">');
  parts.push('<div class="signature-block"><div class="signature-line"></div><div><b>भ्रमण गर्ने पदाधिकारी</b></div><div>मितिः ' + orderDateStr + '</div></div>');
  parts.push('<div class="signature-block"><div class="signature-line"></div><div><b>सिफारिस गर्ने</b></div><div>मितिः ' + orderDateStr + '</div></div>');
  parts.push('<div class="signature-block"><div class="signature-line"></div><div><b>स्वीकृत गर्ने</b></div><div>मितिः ' + orderDateStr + '</div></div>');
  parts.push('</div>');
  parts.push('<div class="divider"></div>');
  parts.push('<div class="admin-section"><b>प्रशासन शाखाले भर्ने</b>');
  parts.push('<div style="display:flex;justify-content:space-between;margin-top:8px">');
  parts.push('<div><b>हाजिरी खातामा जनाएको मिति:</b> ___________________</div>');
  parts.push('<div><b>जनाउने कर्मचारीको दस्तखत:</b> ___________________</div>');
  parts.push('</div></div>');
  parts.push('<div style="margin-top:18px;text-align:center;font-size:10px;color:#555">');
  parts.push('आदेश नं: ' + numLabel + ' — बनाउने: ' + esc(t.createdByName) +
    ' (' + esc(t.createdByUserId) + ')' + approvedLine);
  parts.push('</div></body></html>');

  var win = window.open('', '_blank');
  win.document.write(parts.join(''));
  win.document.close();
}

// ── Boot ─────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTada);
} else {
  initTada();
}