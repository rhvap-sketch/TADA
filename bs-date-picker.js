/**
 * Reusable Nepali BS date picker.
 * Renders three <select> dropdowns (year / month / day) plus syncs
 * with an existing text input.
 *
 * Usage:
 *   BsDatePicker.attach('orderDateBs');
 *   // or with a custom target:
 *   BsDatePicker.attach('orderDateBs', 'orderDatePickerContainer');
 */
const BsDatePicker = (() => {

  const MONTHS_NE = [
    'बैशाख','जेठ','असार','साउन','भदौ','असोज',
    'कार्तिक','मंसिर','पुष','माघ','फाल्गुन','चैत'
  ];

  // Days per month for BS years. Extend as needed.
  const CAL = {
    2079: [31,32,31,32,31,30,30,30,29,30,29,31],
    2080: [31,32,31,32,31,30,30,30,29,30,29,31],
    2081: [31,31,32,31,31,31,30,29,30,29,30,30],
    2082: [30,32,31,32,31,30,30,30,29,30,29,31],
    2083: [31,31,32,31,31,31,30,29,30,29,30,30],
    2084: [31,31,32,31,31,30,30,30,29,30,29,31],
    2085: [31,32,31,32,30,31,30,30,29,30,29,31],
    2086: [30,32,31,32,31,30,30,30,29,30,29,31],
    2087: [31,31,32,31,31,31,30,30,29,30,29,31],
    2088: [30,31,32,32,30,31,30,30,29,30,29,31],
    2089: [30,32,31,32,31,30,30,30,29,30,29,31],
    2090: [30,32,31,32,31,30,30,30,29,30,29,31],
  };

  const YEARS = Object.keys(CAL).map(Number).sort((a, b) => a - b);

  function daysInMonth(year, monthIdx) {
    const months = CAL[year] || CAL[2083];
    return months[monthIdx] || 30;
  }

  function parseBs(bsStr) {
    const m = String(bsStr || '').trim().match(/^(\d{4})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{1,2})$/);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    if (!CAL[y]) return null;
    if (mo < 1 || mo > 12) return null;
    if (d < 1 || d > daysInMonth(y, mo - 1)) return null;
    return { y, mo, d };
  }

  function formatBs(y, mo, d) {
    return `${y}/${String(mo).padStart(2,'0')}/${String(d).padStart(2,'0')}`;
  }

  function attach(textInputId, containerId) {
    const textInput = document.getElementById(textInputId);
    if (!textInput) { console.warn('BsDatePicker: text input not found:', textInputId); return; }

    // Build picker container
    const container = document.createElement('div');
    container.className = 'grid grid-cols-3 gap-2 mt-1';
    container.innerHTML = `
      <select data-part="y" class="w-full px-2 py-1 border rounded text-sm"></select>
      <select data-part="mo" class="w-full px-2 py-1 border rounded text-sm"></select>
      <select data-part="d" class="w-full px-2 py-1 border rounded text-sm"></select>
    `;

    // Insert after the text input
    textInput.parentNode.insertBefore(container, textInput.nextSibling);

    const ySel = container.querySelector('[data-part="y"]');
    const moSel = container.querySelector('[data-part="mo"]');
    const dSel = container.querySelector('[data-part="d"]');

    // Populate year options
    ySel.innerHTML = '<option value="">वर्ष</option>' +
      YEARS.map(y => `<option value="${y}">${toDevanagari(y)}</option>`).join('');

    // Populate month options
    moSel.innerHTML = '<option value="">महिना</option>' +
      MONTHS_NE.map((name, i) => `<option value="${i+1}">${toDevanagari(String(i+1).padStart(2,'0'))} - ${name}</option>`).join('');

    // Populate day options (placeholder until year+month chosen)
    function refreshDays() {
      const y = parseInt(ySel.value, 10);
      const mo = parseInt(moSel.value, 10);
      const dPrev = parseInt(dSel.value, 10);
      let maxDays = 32;
      if (y && mo) maxDays = daysInMonth(y, mo - 1);
      else if (mo) maxDays = 32;
      else maxDays = 32;

      dSel.innerHTML = '<option value="">दिन</option>' +
        Array.from({length: maxDays}, (_, i) => i + 1)
          .map(d => `<option value="${d}">${toDevanagari(String(d).padStart(2,'0'))}</option>`)
          .join('');
      if (dPrev && dPrev <= maxDays) dSel.value = dPrev;
    }
    refreshDays();

    // Sync dropdowns → text input
    function syncToText() {
      const y = parseInt(ySel.value, 10);
      const mo = parseInt(moSel.value, 10);
      const d = parseInt(dSel.value, 10);
      if (y && mo && d) {
        textInput.value = formatBs(y, mo, d);
      }
    }

    // Sync text input → dropdowns
    function syncFromText() {
      const parsed = parseBs(textInput.value);
      if (!parsed) return;
      ySel.value = String(parsed.y);
      moSel.value = String(parsed.mo);
      refreshDays();
      dSel.value = String(parsed.d);
    }

    ySel.addEventListener('change', () => { refreshDays(); syncToText(); });
    moSel.addEventListener('change', () => { refreshDays(); syncToText(); });
    dSel.addEventListener('change', syncToText);
    textInput.addEventListener('input', syncFromText);
    textInput.addEventListener('blur', () => {
      // Normalize format on blur if valid
      const parsed = parseBs(textInput.value);
      if (parsed) {
        textInput.value = formatBs(parsed.y, parsed.mo, parsed.d);
        syncFromText();
      }
    });

    // If the text input already has a value, initialize dropdowns
    if (textInput.value) syncFromText();

    return { container, ySel, moSel, dSel };
  }

  return { attach, parseBs, formatBs, daysInMonth };
})();