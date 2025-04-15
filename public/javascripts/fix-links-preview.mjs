const fileInput = document.getElementById('fileInput');
const form = document.getElementById('fixLinksForm');
const previewContainer = document.getElementById('previewContainer');
const loader = document.getElementById('loader');

let linksToFix = {};

fileInput.addEventListener('change', async () => {
  linksToFix = {};
  previewContainer.innerHTML = '';

  const file = fileInput.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const label = document.createElement('div');


    await page.render({ canvasContext: context, viewport }).promise;

    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'pdf-page';
    pageWrapper.style.width = `${canvas.width}px`;
    pageWrapper.style.height = `${canvas.height}px`;
    pageWrapper.style.position = 'relative';
    
    label.textContent = `Page ${i + 1}`;
    label.className = 'page-label';
    pageWrapper.appendChild(label);
    
    pageWrapper.appendChild(canvas);
    previewContainer.appendChild(pageWrapper);

    const annotations = await page.getAnnotations({ intent: 'display' });
    linksToFix[i] = [];

    for (const annot of annotations) {
      if (annot.subtype === 'Link' && annot.dest && annot.dest[0]?.num != null) {
        const [x1, y1, x2, y2] = annot.rect;
        const [left, top, right, bottom] = pdfjsLib.Util.normalizeRect([
          x1 * viewport.scale,
          y1 * viewport.scale,
          x2 * viewport.scale,
          y2 * viewport.scale,
        ]);

        const box = document.createElement('div');
        box.className = 'link-box';
        box.style.left = `${left}px`;
        box.style.top = `${canvas.height - bottom}px`;
        box.style.width = `${right - left}px`;
        box.style.height = `${bottom - top}px`;

        const input = document.createElement('input');
        input.type = 'number';
        input.min = 1;
        input.value = annot.dest[0].num + 1;
        input.className = 'link-input';
        box.appendChild(input);

        pageWrapper.appendChild(box);

        linksToFix[i].push({
          oldTarget: annot.dest[0].num,
          input,
        });
      }
    }
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  loader.style.display = 'flex';

  const file = fileInput.files[0];
  const filename = document.getElementById('filename').value || 'Updated.pdf';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('filename', filename);

  const linkMap = {};
  for (const [page, items] of Object.entries(linksToFix)) {
    linkMap[page] = items.map(({ oldTarget, input }) => ({
      oldTarget,
      newTarget: parseInt(input.value) - 1,
    }));
  }

  formData.append('linksToFix', JSON.stringify(linkMap));

  try {
    const res = await fetch('/pdf/fix-links', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to fix links');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.click();
  } catch (err) {
    alert('Fixing failed.');
  } finally {
    loader.style.display = 'none';
  }
});
