/**
 * Bikram Sambat (BS) ↔ Gregorian (AD) converter — SAFE version.
 * Covers 2070–2090 BS. Never throws; returns null on bad input.
 */
const NepaliDate = (() => {

  const CAL = {
    2070: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2074: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2075: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2078: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2079: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 31],
    2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2082: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 31],
    2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 29, 31],
    2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 29, 31],
    2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 29, 31],
    2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  };

  const START_BS_YEAR = 2070;
  const START_AD = new Date(1943, 3, 14); // 1943-04-14

  function daysInBsYear(y) {
    const months = CAL[y];
    if (!months) return null;
    return months.reduce(function(a, b) { return a + b; }, 0);
  }

  function isValidYear(y) {
    return !!CAL[y];
  }

  function bsToAd(bs) {
    try {
      if (!bs) return null;
      const parts = String(bs).trim().split(/[\/\-]/).map(Number);
      const y = parts[0], m = parts[1], d = parts[2];
      if (!y || !m || !d) return null;
      if (!isValidYear(y)) {
        console.warn('[NepaliDate] BS year not supported:', y);
        return null;
      }
      if (m < 1 || m > 12) return null;
      if (d < 1 || d > CAL[y][m - 1]) return null;

      let totalDays = 0;
      for (let yr = START_BS_YEAR; yr < y; yr++) {
        const yd = daysInBsYear(yr);
        if (yd == null) return null;
        totalDays += yd;
      }
      const months = CAL[y];
      for (let mo = 0; mo < m - 1; mo++) totalDays += months[mo];
      totalDays += (d - 1);

      const ad = new Date(START_AD.getTime());
      ad.setDate(ad.getDate() + totalDays);
      return ad;
    } catch (e) {
      console.warn('[NepaliDate.bsToAd] failed for', bs, e.message);
      return null;
    }
  }

  function adToBs(date) {
    try {
      if (!(date instanceof Date) || isNaN(date.getTime())) return null;
      let remainingDays = Math.floor((date.getTime() - START_AD.getTime()) / 86400000);

      let y = START_BS_YEAR;
      while (true) {
        const yd = daysInBsYear(y);
        if (yd == null) return null;
        if (remainingDays < yd) break;
        remainingDays -= yd;
        y++;
        if (y > 2090) return null;
      }

      const months = CAL[y];
      let m = 1;
      for (let i = 0; i < months.length; i++) {
        if (remainingDays < months[i]) break;
        remainingDays -= months[i];
        m++;
      }
      return { y: y, m: m, d: remainingDays + 1 };
    } catch (e) {
      console.warn('[NepaliDate.adToBs] failed:', e.message);
      return null;
    }
  }

  function formatBs(bs) {
    if (!bs) return '';
    const parts = String(bs).trim().split(/[\/\-]/);
    if (parts.length < 3) return '';
    const y = parts[0];
    const m = String(parts[1]).padStart(2, '0');
    const d = String(parts[2]).padStart(2, '0');
    return y + '/' + m + '/' + d;
  }

  function todayBs() {
    const r = adToBs(new Date());
    if (!r) return '';
    return r.y + '/' +
           String(r.m).padStart(2, '0') + '/' +
           String(r.d).padStart(2, '0');
  }

  function durationDays(startBs, endBs) {
    const a = bsToAd(startBs);
    const b = bsToAd(endBs);
    if (!a || !b) return 0;
    return Math.floor((b - a) / 86400000) + 1;
  }

  return {
    bsToAd: bsToAd,
    adToBs: adToBs,
    formatBs: formatBs,
    todayBs: todayBs,
    durationDays: durationDays,
    isValidYear: isValidYear,
  };
})();

function toDevanagari(input) {
  const map = { '0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९' };
  return String(input == null ? '' : input).replace(/[0-9]/g, function(d) { return map[d]; });
}

function toDevanagariDate(bs) {
  if (!bs) return '___________________';
  const formatted = NepaliDate.formatBs(bs);
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(formatted)) return '___________________';
  const y = parseInt(formatted.split('/')[0], 10);
  if (!NepaliDate.isValidYear(y)) return toDevanagari(formatted);
  return toDevanagari(formatted);
}