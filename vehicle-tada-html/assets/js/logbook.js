// ─────────────────────────────────────────────────────────────
// Logbook form + preview + print + BS pickers + auth
// Records go to approval queue; official number assigned on approval.
// Preview & Print work ALWAYS — watermark shows "प्रतिक्षामा" until approved.
// ─────────────────────────────────────────────────────────────

let currentPreviewData = null;

// ── Populate dropdowns ────────────────────────────────────────
function initForm() {
  console.log('[logbook] initForm() called');

  const vehicles = DB.getVehicles();
  const vSel = document.getElementById('vehicleId');
  if (!vSel) { console.error('vehicleId not found'); return; }

  vSel.innerHTML = '<option value="">-- छान्नुहोस् --</option>';
  vehicles.filter(v => v.active).forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.number;
    opt.dataset.name = v.name || '';
    vSel.appendChild(opt);
  });

  const nameSel = document.getElementById('vehicleName');
  if (nameSel) {
    nameSel.innerHTML = '<option value="">-- छान्नुहोस् --</option>';
    let names = (typeof DB.getMachineryNames === 'function' ? DB.getMachineryNames() : null) || [];
    if (!names.length) {
      names = [...new Set(vehicles.filter(v => v.active && v.name).map(v => v.name))].sort();
    }
    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      nameSel.appendChild(opt);
    });
  }

  const drivers = DB.getDrivers();
  const dSel = document.getElementById('driverId');
  if (!dSel) { console.error('driverId not found'); return; }
  dSel.innerHTML = '<option value="">-- छान्नुहोस् --</option>';
  drivers.filter(d => d.active).forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    opt.dataset.position = d.position || '';
    opt.dataset.level = d.level || '';
    dSel.appendChild(opt);
  });

  const org = DB.getOrg();
  const ocInput = document.getElementById('officeCode');
  if (ocInput) ocInput.value = org.officeCode || '';

  dSel.addEventListener('change', () => {
    const opt = dSel.selectedOptions[0];
    const posInput = document.getElementById('driverPosition');
    const lvlInput = document.getElementById('driverLevel');
    if (posInput) posInput.value = opt?.dataset?.position || '';
    if (lvlInput) lvlInput.value = opt?.dataset?.level || '';
  });

  vSel.addEventListener('change', () => {
    const opt = vSel.selectedOptions[0];
    const ns = document.getElementById('vehicleName');
    if (ns && opt?.dataset?.name) {
      const match = Array.from(ns.options).find(o => o.value === opt.dataset.name);
      if (match) ns.value = opt.dataset.name;
    }
  });

  if (typeof BsDatePicker !== 'undefined') {
    BsDatePicker.attach('documentDateBs');
  }

  addJourneyRow();
}

// ── Journey rows ──────────────────────────────────────────────
let rowCounter = 0;

function addJourneyRow() {
  const id = 'row-' + (++rowCounter);
  const tbody = document.getElementById('journeyBody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.id = id;
  tr.className = 'border-t';
  tr.innerHTML = `
    <td class="p-1 align-top">
      <input type="text" id="bsDate_${rowCounter}" data-field="bsDate" placeholder="2083/06/16"
          class="w-28 px-2 py-1 border rounded text-xs">
    </td>
    <td class="p-1 align-top"><input type="text" data-field="from" placeholder="डडेल्धुरा"
        class="w-24 px-2 py-1 border rounded text-xs"></td>
    <td class="p-1 align-top"><input type="text" data-field="to" placeholder="जोरायल"
        class="w-24 px-2 py-1 border rounded text-xs"></td>
    <td class="p-1 align-top"><input type="number" data-field="startKm" placeholder="0"
        class="w-20 px-2 py-1 border rounded text-xs text-right" oninput="recalc()"></td>
    <td class="p-1 align-top"><input type="number" data-field="endKm" placeholder="0"
        class="w-20 px-2 py-1 border rounded text-xs text-right" oninput="recalc()"></td>
    <td class="p-1 align-top text-right text-xs font-medium" data-total>0</td>
    <td class="p-1 align-top"><input type="text" data-field="demandFormNo" placeholder="नं."
        class="w-20 px-2 py-1 border rounded text-xs"></td>
    <td class="p-1 align-top"><input type="number" data-field="fuel" placeholder="0" step="0.01"
        class="w-16 px-2 py-1 border rounded text-xs text-right" oninput="recalc()"></td>
    <td class="p-1 align-top"><input type="number" data-field="lubricant" placeholder="0" step="0.01"
        class="w-16 px-2 py-1 border rounded text-xs text-right" oninput="recalc()"></td>
    <td class="p-1 align-top"><input type="number" data-field="grease" placeholder="0" step="0.01"
        class="w-16 px-2 py-1 border rounded text-xs text-right" oninput="recalc()"></td>
    <td class="p-1 align-top"><input type="number" data-field="gearOil" placeholder="0" step="0.01"
        class="w-16 px-2 py-1 border rounded text-xs text-right" oninput="recalc()"></td>
    <td class="p-1 align-top"><input type="number" data-field="other" placeholder="0" step="0.01"
        class="w-16 px-2 py-1 border rounded text-xs text-right" oninput="recalc()"></td>
    <td class="p-1 align-top"><input type="text" data-field="purpose" placeholder="उद्देश्य"
        class="w-40 px-2 py-1 border rounded text-xs"></td>
    <td class="p-1 align-top"><input type="text" data-field="officerName" placeholder="नाम"
        class="w-32 px-2 py-1 border rounded text-xs"></td>
    <td class="p-1 align-top">
      <button type="button" onclick="document.getElementById('${id}').remove(); recalc();"
              class="text-red-600 hover:bg-red-50 px-2 py-1 rounded">×</button>
    </td>`;
  tbody.appendChild(tr);

  if (typeof BsDatePicker !== 'undefined') {
    BsDatePicker.attach('bsDate_' + rowCounter);
  }
}

function recalc() {
  let km = 0, fuel = 0, lub = 0, gr = 0, gear = 0, other = 0;
  document.querySelectorAll('#journeyBody tr').forEach(tr => {
    const get = (f) => tr.querySelector(`[data-field="${f}"]`)?.value || '';
    const s = parseFloat(get('startKm')) || 0;
    const e = parseFloat(get('endKm')) || 0;
    const t = Math.max(0, e - s);
    const cell = tr.querySelector('[data-total]');
    if (cell) cell.textContent = t;
    km += t;
    fuel  += parseFloat(get('fuel')) || 0;
    lub   += parseFloat(get('lubricant')) || 0;
    gr    += parseFloat(get('grease')) || 0;
    gear  += parseFloat(get('gearOil')) || 0;
    other += parseFloat(get('other')) || 0;
  });
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('totalKm', km.toLocaleString());
  set('totalFuel', fuel.toFixed(2));
  set('totalLub', lub.toFixed(2));
  set('totalGrease', gr.toFixed(2));
  set('totalGear', gear.toFixed(2));
  set('totalOther', other.toFixed(2));
}

// ── Collect ────────────────────────────────────────────────────
function collectData() {
  const vSel = document.getElementById('vehicleId');
  const dSel = document.getElementById('driverId');
  const nameSel = document.getElementById('vehicleName');
  const v = DB.getVehicles().find(x => x.id === vSel.value);
  const d = DB.getDrivers().find(x => x.id === dSel.value);
  const org = DB.getOrg();

  if (!v) throw new Error('सवारी नं. छान्नुहोस्');
  const chosenName = nameSel?.value || '';
  if (!chosenName) throw new Error('सवारी साधन/मेसिनरीको नाम छान्नुहोस्');
  if (!d) throw new Error('चालक/अपरेटर छान्नुहोस्');

  const documentDateBs = document.getElementById('documentDateBs')?.value.trim() || '';
  if (!documentDateBs) throw new Error('कागजात मिति आवश्यक');
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(documentDateBs)) {
    throw new Error('कागजात मिति ढाँचा मिलेन (YYYY/MM/DD)');
  }

  const bsRegex = /^\d{4}\/\d{2}\/\d{2}$/;
  const journeys = [];

  document.querySelectorAll('#journeyBody tr').forEach(tr => {
    const get = (f) => tr.querySelector(`[data-field="${f}"]`)?.value || '';
    const bsDate = get('bsDate').trim();
    const from = get('from').trim();
    const to = get('to').trim();
    const startKm = parseFloat(get('startKm'));
    const endKm = parseFloat(get('endKm'));
    const purpose = get('purpose').trim();
    const officerName = get('officerName').trim();

    if (!bsDate && !from && !to && isNaN(startKm) && isNaN(endKm) &&
        !purpose && !officerName) return;

    if (!bsDate) throw new Error('मिति आवश्यक');
    if (!bsRegex.test(bsDate)) throw new Error('मिति ढाँचा मिलेन (YYYY/MM/DD)');
    if (!from) throw new Error('"बाट" आवश्यक');
    if (!to) throw new Error('"सम्म" आवश्यक');
    if (isNaN(startKm)) throw new Error('सुरु KM आवश्यक');
    if (isNaN(endKm)) throw new Error('अन्त KM आवश्यक');
    if (endKm < startKm) throw new Error(`अन्त्य KM सुरु भन्दा कम (${bsDate})`);
    if (!purpose) throw new Error('उद्देश्य आवश्यक');
    if (!officerName) throw new Error('कर्मचारीको नाम आवश्यक');

    journeys.push({
      bsDate, from, to, startKm, endKm,
      demandFormNo: get('demandFormNo'),
      fuel: get('fuel'),
      lubricant: get('lubricant'),
      grease: get('grease'),
      gearOil: get('gearOil'),
      other: get('other'),
      purpose, officerName,
    });
  });

  if (!journeys.length) throw new Error('कम्तीमा एक यात्रा थप्नुहोस्');

  return {
    vehicle: { ...v, name: chosenName },
    driver: d,
    officeCode: org.officeCode || '',
    documentDateBs,
    journeys,
    totalKm: journeys.reduce((s, j) => s + (j.endKm - j.startKm), 0),
    totalFuel: journeys.reduce((s, j) => s + (parseFloat(j.fuel) || 0), 0),
  };
}

// ── Escape ─────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

// ── Preview watermark when not approved ────────────────────────
function watermarkHtml(status) {
  if (status === 'APPROVED') return '';
  const label = status === 'REJECTED' ? 'अस्वीकृत' : 'प्रतिक्षामा';
  const color = status === 'REJECTED' ? '#dc2626' : '#d97706';
  return `
    <div style="position:relative">
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:10">
        <div style="transform:rotate(-30deg);font-size:80px;font-weight:900;color:${color};opacity:0.18;letter-spacing:8px;white-space:nowrap">${label}</div>
      </div>
      <div style="text-align:center;margin-bottom:8px">
        <span style="display:inline-block;padding:4px 14px;border:2px solid ${color};color:${color};font-weight:700;border-radius:6px;font-size:12px;letter-spacing:2px">${label}</span>
      </div>
    </div>`;
}

// ── Build preview ──────────────────────────────────────────────
function buildLogbookPreview(data, displayNumber, status) {
  const org = DB.getOrg();
  const me = (typeof App !== 'undefined' && App.currentUser) ? App.currentUser() : null;
  status = status || 'PENDING';

  const rows = data.journeys.map(j => `
    <tr>
      <td style="text-align:center">${toDevanagariDate(j.bsDate)}</td>
      <td>${esc(j.from)}</td>
      <td>${esc(j.to)}</td>
      <td style="text-align:right">${toDevanagari(j.startKm)}</td>
      <td style="text-align:right">${toDevanagari(j.endKm)}</td>
      <td style="text-align:right">${toDevanagari(j.endKm - j.startKm)}</td>
      <td style="text-align:center">${esc(j.demandFormNo || '')}</td>
      <td style="text-align:right">${j.fuel ? toDevanagari(j.fuel) : ''}</td>
      <td style="text-align:right">${j.lubricant ? toDevanagari(j.lubricant) : ''}</td>
      <td style="text-align:right">${j.grease ? toDevanagari(j.grease) : ''}</td>
      <td style="text-align:right">${j.gearOil ? toDevanagari(j.gearOil) : ''}</td>
      <td style="text-align:right">${j.other ? toDevanagari(j.other) : ''}</td>
      <td>${esc(j.purpose)}</td>
      <td>${esc(j.officerName)}</td>
      <td></td>
      <td></td>
    </tr>`).join('');

  const blankCount = Math.max(0, 8 - data.journeys.length);
  const blanks = Array(blankCount).fill(`
    <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td>
    <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('');

  const tKm = data.journeys.reduce((s, j) => s + (j.endKm - j.startKm), 0);
  const tF  = data.journeys.reduce((s, j) => s + (parseFloat(j.fuel) || 0), 0);
  const tL  = data.journeys.reduce((s, j) => s + (parseFloat(j.lubricant) || 0), 0);
  const tG  = data.journeys.reduce((s, j) => s + (parseFloat(j.grease) || 0), 0);
  const tGo = data.journeys.reduce((s, j) => s + (parseFloat(j.gearOil) || 0), 0);
  const tO  = data.journeys.reduce((s, j) => s + (parseFloat(j.other) || 0), 0);

  const numberLabel = status === 'APPROVED' ? esc(displayNumber) : 'मस्यौदा (Draft)';

  return `
    <div style="position:relative">
      ${watermarkHtml(status)}
      <div style="text-align:center; margin-bottom:6px">
        <img src="assets/img/nepal-emblem.png" alt="Nepal Emblem"
             style="width:55px;height:55px;object-fit:contain;display:inline-block">
      </div>
      <div class="header-line title">${esc(org.province || 'सुदूरपश्चिम प्रदेश सरकार')}</div>
      <div class="header-line sub">${esc(org.ministry || 'भूमि व्यवस्था, कृषि तथा सहकारी मन्त्रालय')}</div>
      <div class="header-line sub">${esc(org.program || 'उच्च मूल्य कृषिवस्तु उत्थानशील कार्यक्रम, डडेल्धुरा')}</div>
      <div class="header-line sub">कार्यालय कोड नं.: ${esc(data.officeCode)}</div>
      <div class="header-line title" style="margin-top:14px">सवारी साधन र मेसिन प्रयोगको लगबुक</div>

      <div class="meta-info">
        <div>
          <div><b>सवारी नं.:</b> ${esc(data.vehicle.number)}</div>
          <div style="margin-top:6px"><b>सवारी साधन/मेसिनरीको नाम:</b> ${esc(data.vehicle.name)}</div>
        </div>
        <div class="right">
          <div><b>सवारी चालक/अपरेटरको नाम:</b> ${esc(data.driver.name)}</div>
          <div style="margin-top:6px"><b>पद:</b> ${esc(data.driver.position || '')}</div>
          <div style="margin-top:6px"><b>तह:</b> ${esc(data.driver.level || '')}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th rowspan="2">मिति</th>
            <th colspan="2">ठाउँ</th>
            <th colspan="2">किलोमिटर</th>
            <th rowspan="2">जम्मा</th>
            <th rowspan="2">माग फारम नं</th>
            <th colspan="5">पेट्रोलियम पदार्थ</th>
            <th rowspan="2">सवारी प्रयोगको उद्देश्य</th>
            <th colspan="2">सवारी प्रयोग गर्ने कर्मचारी/पदाधिकारीको</th>
            <th rowspan="2">कैफियत</th>
          </tr>
          <tr>
            <th>बाट</th><th>सम्म</th>
            <th>बाट</th><th>सम्म</th>
            <th>पेट्रोल/<br>डिजेल/<br>अन्य</th>
            <th>लुब्रिकेन्ट</th><th>ग्रिज</th><th>गेयर आयल</th><th>अन्य</th>
            <th>नाम</th><th>दस्तखत</th>
          </tr>
        </thead>
        <tbody>
          ${rows}${blanks}
          <tr style="font-weight:600;background:#f9fafb">
            <td colspan="5" style="text-align:right">जम्मा:</td>
            <td style="text-align:right">${toDevanagari(tKm)}</td>
            <td></td>
            <td style="text-align:right">${toDevanagari(tF.toFixed(2))}</td>
            <td style="text-align:right">${toDevanagari(tL.toFixed(2))}</td>
            <td style="text-align:right">${toDevanagari(tG.toFixed(2))}</td>
            <td style="text-align:right">${toDevanagari(tGo.toFixed(2))}</td>
            <td style="text-align:right">${toDevanagari(tO.toFixed(2))}</td>
            <td colspan="4"></td>
          </tr>
        </tbody>
      </table>

      <div class="signature-row">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div><b>सवारी चालक/अपरेटरको नाम</b></div>
          <div>${esc(data.driver.name)}</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div><b>दस्तखत</b></div>
          <div>&nbsp;</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div><b>मिति</b></div>
          <div>${toDevanagariDate(data.documentDateBs)}</div>
        </div>
      </div>

      <div style="margin-top:20px;text-align:center;font-size:10px;color:#555">
        कागजात नं: ${numberLabel} — मिति: ${toDevanagariDate(data.documentDateBs)}
        ${me ? `<br>बनाउने: ${esc(me.name)} (${esc(me.userId)})` : ''}
      </div>
    </div>`;
}

// ── Save as PENDING, no official number yet ────────────────────
function savePendingLogbook(data) {
  const u = App.currentUser();
  const logbooks = DB.getLogbooks();
  const rec = {
    id: DB.uid(),
    // No official record number yet — assigned on approval
    draftId: 'DRAFT-' + Date.now().toString(36).toUpperCase(),
    createdByUserId: u.userId,
    createdByName: u.name,
    createdByEmail: u.email,
    vehicleNumber: data.vehicle.number,
    vehicleName: data.vehicle.name,
    driverName: data.driver.name,
    driverPosition: data.driver.position,
    driverLevel: data.driver.level,
    officeCode: data.officeCode,
    documentDateBs: data.documentDateBs,
    journeys: data.journeys,
    totalKm: data.totalKm,
    totalFuel: data.totalFuel,
    userEmail: u.email,
    createdAt: new Date().toISOString(),
    createdAtBs: NepaliDate.todayBs(),
    status: 'PENDING',
    approvedRecordNumber: null,      // filled when admin approves
  };
  logbooks.push(rec);
  DB.setLogbooks(logbooks);
  DB.audit('LOGBOOK_CREATED', { docType: 'LOGBOOK', recordId: rec.draftId });
  return rec;
}

// ── Preview action (ALWAYS available) ──────────────────────────
function previewLogbook() {
  try {
    console.log('[logbook] previewLogbook() called');

    const data = collectData();
    const draftLabel = 'DRAFT-' + Date.now().toString(36).toUpperCase();

    currentPreviewData = { data, recordNumber: draftLabel, status: 'PENDING' };

    const html = buildLogbookPreview(data, draftLabel, 'PENDING');
    const area = document.getElementById('printArea');
    if (!area) { alert('❌ printArea element missing'); return; }
    area.innerHTML = html;

    const recNo = document.getElementById('previewRecordNo');
    if (recNo) recNo.textContent = 'प्रतिक्षामा — मस्यौदा (Pending — Draft)';

    document.getElementById('previewModal').classList.remove('hidden');

    savePendingLogbook(data);

    App.toast('✅ पूर्वावलोकन तयार — स्वीकृतिको लागि पठाइयो', 'success');
  } catch (e) {
    console.error('[logbook] preview error:', e);
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
    const { data, recordNumber } = currentPreviewData;
    const buf = await ExcelGenerator.generateLogbook(data);
    ExcelGenerator.download(buf, `${recordNumber}.xlsx`);
    App.toast('✅ Excel डाउनलोड भयो', 'success');
  } catch (e) { App.toast('❌ ' + e.message, 'error'); }
}

async function downloadExcelOnly() {
  try {
    const data = collectData();
    const draftLabel = 'DRAFT-' + Date.now().toString(36).toUpperCase();
    const buf = await ExcelGenerator.generateLogbook(data);
    ExcelGenerator.download(buf, `${draftLabel}.xlsx`);
    savePendingLogbook(data);
    App.toast('✅ Excel डाउनलोड भयो — स्वीकृतिको लागि पठाइयो', 'success');
  } catch (e) {
    console.error(e);
    App.toast('❌ ' + e.message, 'error');
  }
}
// ─────────────────────────────────────────────────────────────
// Shared: open a print-ready preview window for a saved logbook
// ─────────────────────────────────────────────────────────────
function openLogbookPrintWindow(l) {
  if (!l) return;
  const org = DB.getOrg();
  const status = l.status;
  const displayNum = (status === 'APPROVED' && l.approvedRecordNumber)
    ? l.approvedRecordNumber
    : (l.draftId || 'DRAFT');

  const watermark = (status === 'APPROVED') ? '' :
    '<div style="text-align:center;margin-bottom:8px">' +
      '<span style="display:inline-block;padding:4px 14px;border:2px solid ' +
      (status === 'REJECTED' ? '#dc2626' : '#d97706') + ';color:' +
      (status === 'REJECTED' ? '#dc2626' : '#d97706') +
      ';font-weight:700;border-radius:6px;font-size:12px;letter-spacing:2px">' +
      (status === 'REJECTED' ? 'अस्वीकृत' : 'प्रतिक्षामा') +
      '</span></div>';

  const numLabel = (status === 'APPROVED') ? esc(displayNum) : 'मस्यौदा (Draft)';

  const approvedLine = (l.status === 'APPROVED' && l.approvedByName)
  ? '<br>स्वीकृत: ' + esc(l.approvedByName) +
    ' (' + esc(l.approvedByUserId) + ')' +
    (l.approvedAtBs ? ' — ' + toDevanagariDate(l.approvedAtBs) : '')
  : '';

  const css = [
    "body{font-family:'Noto Sans Devanagari','Mangal','Kalimati',Arial,sans-serif;padding:20px;color:#000;position:relative}",
    ".no-print{position:fixed;top:12px;right:12px;z-index:100}",
    ".no-print button{padding:10px 18px;font-size:14px;border-radius:8px;border:0;cursor:pointer;color:#fff;background:#15803d;font-weight:600}",
    ".header-line{text-align:center}",
    ".header-line.title{font-size:15px;font-weight:700;margin-top:8px}",
    ".header-line.sub{font-size:12px}",
    "table{border-collapse:collapse;width:100%}",
    "th,td{border:1px solid #000;padding:4px 6px;font-size:11px;vertical-align:top}",
    "th{background:#f3f4f6;text-align:center}",
    ".signature-row{display:flex;justify-content:space-between;margin-top:50px}",
    ".signature-block{width:30%;text-align:center;font-size:12px}",
    ".signature-line{border-top:1px solid #000;margin:30px 0 4px}",
    ".meta-info{display:flex;justify-content:space-between;margin:12px 0;font-size:12px}",
    "@media print{.no-print{display:none!important}body{padding:0}@page{size:A3 landscape;margin:8mm}}"
  ].join('');

  const rows = (l.journeys || []).map(function(j) {
    return '<tr>' +
      '<td style="text-align:center">' + toDevanagariDate(j.bsDate) + '</td>' +
      '<td>' + esc(j.from) + '</td>' +
      '<td>' + esc(j.to) + '</td>' +
      '<td style="text-align:right">' + toDevanagari(j.startKm) + '</td>' +
      '<td style="text-align:right">' + toDevanagari(j.endKm) + '</td>' +
      '<td style="text-align:right">' + toDevanagari(j.endKm - j.startKm) + '</td>' +
      '<td style="text-align:center">' + esc(j.demandFormNo || '') + '</td>' +
      '<td style="text-align:right">' + (j.fuel ? toDevanagari(j.fuel) : '') + '</td>' +
      '<td style="text-align:right">' + (j.lubricant ? toDevanagari(j.lubricant) : '') + '</td>' +
      '<td style="text-align:right">' + (j.grease ? toDevanagari(j.grease) : '') + '</td>' +
      '<td style="text-align:right">' + (j.gearOil ? toDevanagari(j.gearOil) : '') + '</td>' +
      '<td style="text-align:right">' + (j.other ? toDevanagari(j.other) : '') + '</td>' +
      '<td>' + esc(j.purpose) + '</td>' +
      '<td>' + esc(j.officerName) + '</td>' +
      '<td></td><td></td></tr>';
  }).join('');

  const parts = [];
  parts.push('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(displayNum) + '</title>');
  parts.push('<style>' + css + '</style></head><body>');
  parts.push('<div class="no-print"><button onclick="window.print()">🖨️ प्रिन्ट / PDF सेभ</button></div>');
  parts.push(watermark);
  parts.push('<div style="text-align:center;margin-bottom:6px"><img src="assets/img/nepal-emblem.png" style="width:55px;height:55px;object-fit:contain;display:inline-block"></div>');
  parts.push('<div class="header-line title">' + esc(org.province || '') + '</div>');
  parts.push('<div class="header-line sub">' + esc(org.ministry || '') + '</div>');
  parts.push('<div class="header-line sub">' + esc(org.program || '') + '</div>');
  parts.push('<div class="header-line sub">कार्यालय कोड नं.: ' + esc(l.officeCode || '') + '</div>');
  parts.push('<div class="header-line title" style="margin-top:14px">सवारी साधन र मेसिन प्रयोगको लगबुक</div>');

  parts.push('<div class="meta-info">');
  parts.push('<div>');
  parts.push('<div><b>सवारी नं.:</b> ' + esc(l.vehicleNumber) + '</div>');
  parts.push('<div><b>सवारी साधन/मेसिनरीको नाम:</b> ' + esc(l.vehicleName) + '</div>');
  parts.push('</div>');
  parts.push('<div style="text-align:right">');
  parts.push('<div><b>चालक/अपरेटर:</b> ' + esc(l.driverName) + '</div>');
  parts.push('<div><b>पद:</b> ' + esc(l.driverPosition || '') + '</div>');
  parts.push('<div><b>तह:</b> ' + esc(l.driverLevel || '') + '</div>');
  parts.push('</div></div>');

  parts.push('<table><thead><tr>');
  parts.push('<th>मिति</th><th colspan="2">ठाउँ</th><th colspan="2">किलोमिटर</th>');
  parts.push('<th>जम्मा</th><th>माग फारम नं</th>');
  parts.push('<th colspan="5">पेट्रोलियम पदार्थ</th>');
  parts.push('<th>उद्देश्य</th><th colspan="2">प्रयोग गर्ने कर्मचारी</th><th>कैफियत</th>');
  parts.push('</tr><tr>');
  parts.push('<th></th><th>बाट</th><th>सम्म</th><th>बाट</th><th>सम्म</th>');
  parts.push('<th></th><th></th>');
  parts.push('<th>इन्धन</th><th>लुब्रिकेन्ट</th><th>ग्रिज</th>');
  parts.push('<th>गेयर आयल</th><th>अन्य</th><th></th>');
  parts.push('<th>नाम</th><th>दस्तखत</th><th></th>');
  parts.push('</tr></thead><tbody>');
  parts.push(rows);
  parts.push('<tr style="font-weight:600;background:#f9fafb">');
  parts.push('<td colspan="5" style="text-align:right">जम्मा:</td>');
  parts.push('<td style="text-align:right">' + toDevanagari(l.totalKm || 0) + '</td>');
  parts.push('<td></td>');
  parts.push('<td style="text-align:right">' + toDevanagari((l.totalFuel || 0).toFixed(2)) + '</td>');
  parts.push('<td colspan="4"></td>');
  parts.push('<td colspan="5"></td>');
  parts.push('</tr></tbody></table>');

  parts.push('<div class="signature-row">');
  parts.push('<div class="signature-block"><div class="signature-line"></div><div><b>चालक/अपरेटर</b></div><div>' + esc(l.driverName) + '</div></div>');
  parts.push('<div class="signature-block"><div class="signature-line"></div><div><b>दस्तखत</b></div></div>');
  parts.push('<div class="signature-block"><div class="signature-line"></div><div><b>मिति</b></div><div>' + toDevanagariDate(l.documentDateBs || l.createdAtBs) + '</div></div>');
  parts.push('</div>');

  parts.push('<div style="margin-top:20px;text-align:center;font-size:10px;color:#555">');
  parts.push('कागजात नं: ' + numLabel + ' — बनाउने: ' + esc(l.createdByName) +
    ' (' + esc(l.createdByUserId) + ')' + approvedLine);
  parts.push('</div></body></html>');

  const win = window.open('', '_blank');
  win.document.write(parts.join(''));
  win.document.close();
}
// ── Boot ───────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initForm);
} else {
  initForm();
}