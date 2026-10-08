/**
 * Loads your .xlsx template, populates mapped cells, returns a Blob.
 * Preserves formatting because we only modify cell .v values.
 *
 * Adjust cell addresses here to match your actual template.
 */
const ExcelGenerator = (() => {

  function setCell(ws, address, value) {
    if (value === undefined || value === null || value === '') return;
    const cell = ws[address];
    if (cell) {
      cell.v = value;
      if (cell.f) delete cell.f;
      cell.t = typeof value === 'number' ? 'n' : 's';
    } else {
      ws[address] = { t: typeof value === 'number' ? 'n' : 's', v: value };
    }
  }

  async function loadTemplate(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Template not found: ${path}. Please place it in /templates/.`);
    return await res.arrayBuffer();
  }

  // ── LOGBOOK mapping ────────────────────────────────────────
  const LOGBOOK = {
    sheet: 'लगबुक',
    header: {
      vehicleNumber:  'B7',
      vehicleName:    'B8',
      driverName:     'L7',
      driverPosition: 'L8',
      driverLevel:    'L9',
      officeCode:     'B4',
    },
    table: {
      firstDataRow: 13,
      lastDataRow:  21,
      col: {
        date: 'A', from: 'B', to: 'C',
        startKm: 'D', endKm: 'E', totalKm: 'F',
        demandFormNo: 'G',
        fuel: 'H', lubricant: 'I', grease: 'J', gearOil: 'K', other: 'L',
        purpose: 'M', officerName: 'N', signature: 'O', remarks: 'P',
      },
    },
  };

  async function generateLogbook(data) {
    const buf = await loadTemplate('templates/logbook.xlsx');
    const wb = XLSX.read(buf, { type: 'array', cellStyles: true });
    const ws = wb.Sheets[LOGBOOK.sheet];
    if (!ws) throw new Error(`Sheet "${LOGBOOK.sheet}" not found. Available: ${wb.SheetNames.join(', ')}`);

    // Header fields
    setCell(ws, LOGBOOK.header.vehicleNumber,  data.vehicle.number);
    setCell(ws, LOGBOOK.header.vehicleName,    data.vehicle.name);
    setCell(ws, LOGBOOK.header.driverName,     data.driver.name);
    setCell(ws, LOGBOOK.header.driverPosition, data.driver.position);
    setCell(ws, LOGBOOK.header.driverLevel,    data.driver.level);
    setCell(ws, LOGBOOK.header.officeCode,     data.officeCode);

    // Journey rows
    const start = LOGBOOK.table.firstDataRow;
    const maxRows = LOGBOOK.table.lastDataRow - start + 1;
    if (data.journeys.length > maxRows) {
      throw new Error(`Template holds max ${maxRows} rows. You have ${data.journeys.length}.`);
    }

    data.journeys.forEach((j, i) => {
      const r = start + i;
      const c = LOGBOOK.table.col;

      setCell(ws, `${c.date}${r}`,         toDevanagariDate(j.bsDate));
      setCell(ws, `${c.from}${r}`,         j.from);
      setCell(ws, `${c.to}${r}`,           j.to);
      setCell(ws, `${c.startKm}${r}`,      Number(j.startKm));
      setCell(ws, `${c.endKm}${r}`,        Number(j.endKm));
      setCell(ws, `${c.totalKm}${r}`,      Number(j.endKm) - Number(j.startKm));
      setCell(ws, `${c.demandFormNo}${r}`, j.demandFormNo || '');
      if (j.fuel)      setCell(ws, `${c.fuel}${r}`,      Number(j.fuel));
      if (j.lubricant) setCell(ws, `${c.lubricant}${r}`, Number(j.lubricant));
      if (j.grease)    setCell(ws, `${c.grease}${r}`,    Number(j.grease));
      if (j.gearOil)   setCell(ws, `${c.gearOil}${r}`,   Number(j.gearOil));
      if (j.other)     setCell(ws, `${c.other}${r}`,     Number(j.other));
      setCell(ws, `${c.purpose}${r}`,      j.purpose);
      setCell(ws, `${c.officerName}${r}`,  j.officerName);
      setCell(ws, `${c.remarks}${r}`,      j.remarks || '');
    });

    return XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellStyles: true });
  }

  // ── TADA mapping ───────────────────────────────────────────
  const TADA = {
    sheet: 'Sheet1',
    header: {
      officeCode:   'A5',
      travelType:   'A6',
      orderNumber:  'G7',
      orderDate:    'G8',
      employeeName: 'D9',
      position:     'D10',
      office:       'D11',
      destination:  'D12',
      purpose:      'D13',
      travelPeriod: 'D14',
      transportOffice: 'B15',
      transportPublic: 'D15',
      transportHired:  'F15',
      advanceAmount:   'D17',
      otherDetails:    'D18',
      signatureDate1:  'A21',
      signatureDate2:  'C21',
      signatureDate3:  'F21',
    },
  };

  async function generateTada(data) {
    const buf = await loadTemplate('templates/tada.xlsx');
    const wb = XLSX.read(buf, { type: 'array', cellStyles: true });
    const ws = wb.Sheets[TADA.sheet];
    if (!ws) throw new Error(`Sheet "${TADA.sheet}" not found. Available: ${wb.SheetNames.join(', ')}`);

    const h = TADA.header;
    setCell(ws, h.officeCode,   `कार्यालय कोड नं.: ${data.officeCode}`);
    setCell(ws, h.travelType,   `${data.travelType} भ्रमण आदेश`);
    setCell(ws, h.orderNumber,  `आदेश नं: ${data.orderNumber}`);
    setCell(ws, h.orderDate,    `मिति: ${toDevanagariDate(data.orderDateBs)}`);
    setCell(ws, h.employeeName, data.employeeName);
    setCell(ws, h.position,     data.position);
    setCell(ws, h.office,       data.office);
    setCell(ws, h.destination,  data.destination);
    setCell(ws, h.purpose,      data.purpose);
    setCell(ws, h.travelPeriod, `${toDevanagariDate(data.startBs)} देखी ${toDevanagariDate(data.endBs)} सम्म`);
    setCell(ws, h.transportOffice, data.transportOffice ? 'True' : 'False');
    setCell(ws, h.transportPublic, data.transportPublic ? 'True' : 'False');
    setCell(ws, h.transportHired,  data.transportHired  ? 'True' : 'False');
    if (data.advanceAmount) setCell(ws, h.advanceAmount, data.advanceAmount);
    if (data.otherDetails)  setCell(ws, h.otherDetails, data.otherDetails);
    setCell(ws, h.signatureDate1, `मितिः ${toDevanagariDate(data.orderDateBs)}`);
    setCell(ws, h.signatureDate2, `मितिः ${toDevanagariDate(data.orderDateBs)}`);
    setCell(ws, h.signatureDate3, `मितिः ${toDevanagariDate(data.orderDateBs)}`);

    return XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellStyles: true });
  }

  function download(blobData, filename) {
    const blob = new Blob([blobData], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { generateLogbook, generateTada, download };
})();