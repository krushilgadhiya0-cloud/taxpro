// TaxPro Universal Ultra-Reliable Print Engine
// Uses hidden isolated iframe rendering (Zero pop-up blocker issues, Zero blank page bugs)

export const printHtml = (title, bodyHtml, customCss = '') => {
  try {
    let iframe = document.getElementById('taxpro-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'taxpro-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const firmName = localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates';
    const firmGst = localStorage.getItem('taxpro_firm_gst') || '';
    const firmPan = localStorage.getItem('taxpro_firm_pan') || '';
    const firmEmail = localStorage.getItem('taxpro_firm_email') || 'contact@taxpro.com';
    const firmPhone = localStorage.getItem('taxpro_firm_phone') || '';
    const firmAddress = localStorage.getItem('taxpro_firm_address') || '';
    const currentDate = new Date().toLocaleString();

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title || 'TaxPro PMS Document'}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
          }
          .header-box {
            border-bottom: 2.5px solid #5b52e0;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .firm-title {
            font-size: 18px;
            font-weight: 900;
            color: #181c32;
            letter-spacing: -0.3px;
          }
          .doc-badge {
            display: inline-block;
            background: #5b52e0;
            color: white;
            padding: 3px 12px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-text {
            font-size: 10px;
            color: #6b7280;
            line-height: 1.35;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10.5px;
          }
          th {
            background: #f8fafc;
            border-bottom: 2px solid #cbd5e1;
            border-top: 1px solid #e2e8f0;
            padding: 8px 10px;
            text-align: left;
            font-weight: 800;
            color: #334155;
            text-transform: uppercase;
            font-size: 9.5px;
            letter-spacing: 0.5px;
          }
          td {
            padding: 7px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          tr:nth-child(even) td {
            background: #fafafa;
          }
          .status-pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 9.5px;
          }
          .status-completed { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .status-progress { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
          .status-pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
          .status-overdue { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
          .badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; }
          .badge-teal { background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #94a3b8;
          }
          ${customCss}
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="firm-title">${firmName}</div>
            <div class="meta-text">${[firmGst ? `GSTIN: ${firmGst}` : '', firmPan ? `PAN: ${firmPan}` : '', firmEmail, firmPhone].filter(Boolean).join(' • ')}</div>
            ${firmAddress ? `<div class="meta-text">${firmAddress}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <div class="doc-badge">${title || 'Official Register'}</div>
            <div class="meta-text" style="margin-top: 5px;">Printed: ${currentDate}</div>
          </div>
        </div>
        
        <div class="content-body">
          ${bodyHtml}
        </div>

        <div class="footer">
          <span>TaxPro Practice Management Suite — Official Record</span>
          <span>Confidential • Prepared for Practice Review</span>
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        window.print();
      }
    }, 300);
  } catch (err) {
    console.error('[Print Engine Fallback]:', err);
    window.print();
  }
};

export default printHtml;
