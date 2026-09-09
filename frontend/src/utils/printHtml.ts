/**
 * Opens Chrome's native print preview for the given HTML, without a new browser window.
 * Uses a hidden iframe so only the bill is sent to the printer / Save as PDF.
 */
export function printHtmlInChromeDialog(html: string, documentTitle = "Water Bill"): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();
  doc.title = documentTitle;

  const cleanup = () => {
    win.removeEventListener("afterprint", cleanup);
    iframe.remove();
  };
  win.addEventListener("afterprint", cleanup);
  window.setTimeout(cleanup, 120000);

  const triggerPrint = () => {
    win.focus();
    win.print();
  };

  const images = Array.from(doc.images);
  const pending = images.filter((img) => !img.complete);
  if (pending.length === 0) {
    window.setTimeout(triggerPrint, 50);
    return;
  }
  Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    )
  ).then(() => window.setTimeout(triggerPrint, 50));
}

export function printElementInChromeDialog(
  element: HTMLElement,
  css: string,
  documentTitle = "Water Bill"
): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${css}
  </style>
</head>
<body>${element.innerHTML}</body>
</html>`;
  printHtmlInChromeDialog(html, documentTitle);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
