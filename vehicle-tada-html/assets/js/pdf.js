/**
 * PDF generator with fixes for wide tables.
 *
 * Key improvements over the simple version:
 *  1. Uses A3 landscape for Logbook (16 columns is too wide for A4)
 *  2. Waits for fonts to be fully loaded before rendering (Nepali fix)
 *  3. Forces a white background
 *  4. Uses windowWidth to prevent horizontal cutoff
 *  5. Renders into a fixed-width container so html2canvas doesn't exceed canvas limits
 */
const PdfGenerator = (() => {

  async function fromXlsx(xlsxArrayBuffer, filename, opts = {}) {
    const {
      // 'logbook' → wide layout | 'tada' → narrower | 'auto'
      kind = 'auto',
      sheetName = null,
    } = opts;

    // Ensure fonts are ready (critical for Nepali Unicode)
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const wb = XLSX.read(xlsxArrayBuffer, { type: 'array', cellStyles: true });
    const ws = wb.Sheets[sheetName || wb.SheetNames[0]];

    // Convert to HTML
    const htmlTable = XLSX.utils.sheet_to_html(ws, { id: 'xlsxTable', editable: false });

    // Build a clean container with a fixed pixel width.
    // This prevents html2canvas from trying to render an enormous canvas.
    const targetWidth = kind === 'logbook' ? 2000 : 1400;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-99999px';
    container.style.top = '0';
    container.style.width = targetWidth + 'px';
    container.style.background = 'white';
    container.style.padding = '24px';
    container.style.fontFamily =
      "'Noto Sans Devanagari', 'Mangal', 'Kalimati', Arial, sans-serif";
    container.style.fontSize = '12px';
    container.style.color = '#000';
    container.innerHTML = `
      <style>
        #xlsxTable { border-collapse: collapse; width: 100%; table-layout: auto; }
        #xlsxTable td, #xlsxTable th {
          border: 1px solid #666;
          padding: 4px 6px;
          vertical-align: top;
          white-space: normal;
          word-break: break-word;
          font-family: inherit;
          color: #000;
        }
        #xlsxTable td:empty { border: 1px solid #666; min-height: 18px; }
      </style>
      ${htmlTable}
    `;

    document.body.appendChild(container);

    // Auto-detect wide table → use A3 landscape
    const cols = ws['!ref']
      ? XLSX.utils.decode_range(ws['!ref']).e.c + 1
      : 10;
    const isWide = kind === 'logbook' || cols > 10;

    const pdfOptions = {
      margin:      [8, 8, 8, 8],
      filename,
      image:       { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
        windowWidth: targetWidth,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: {
        unit: 'mm',
        format: isWide ? 'a3' : 'a4',
        orientation: 'landscape',
      },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    try {
      await html2pdf().set(pdfOptions).from(container).save();
      return true;
    } finally {
      // Always clean up
      if (container.parentNode) container.parentNode.removeChild(container);
    }
  }

  return { fromXlsx };
})();