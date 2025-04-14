// import JSZip from 'jszip';

const fileInput = document.getElementById('fileInput');
const form = document.getElementById('uploadForm');
const previewContainer = document.getElementById('previewContainer');
const loader = document.getElementById('loader');

let pagesToRemove = [];

fileInput.addEventListener('change', async () => {
  pagesToRemove = [];
  previewContainer.innerHTML = '';

  const files = fileInput.files;
  const zip = new JSZip();

  for (const file of files) {
    if (file.type === 'application/zip') {
      const zipContent = await file.arrayBuffer();
      const zipData = await zip.loadAsync(zipContent);

      for (const name in zipData.files) {
        if (name.endsWith('.pdf')) {
          const blob = await zipData.files[name].async('blob');
          await renderPDF(blob, name);
        }
      }
    } else if (file.type === 'application/pdf') {
      await renderPDF(file, file.name);
    }
  }
});

async function renderPDF(file, filename) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 0.3 });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'pdf-page';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.page = i;

    checkbox.addEventListener('change', () => {
      const pageNum = parseInt(checkbox.dataset.page);
      if (checkbox.checked) {
        pagesToRemove.push(pageNum);
        pageWrapper.classList.add('selected');
      } else {
        pagesToRemove = pagesToRemove.filter(p => p !== pageNum);
        pageWrapper.classList.remove('selected');
      }
    });

    const label = document.createElement('label');
    label.innerText = `Page ${i + 1}`;
    label.appendChild(checkbox);

    pageWrapper.appendChild(canvas);
    pageWrapper.appendChild(label);
    previewContainer.appendChild(pageWrapper);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  loader.style.display = 'flex';

  const formData = new FormData();
  const filename = document.getElementById('filename').value || 'MergedFile.pdf';

  for (const file of fileInput.files) {
    formData.append('files', file);
  }

  formData.append('filename', filename);
  formData.append('pagesToRemove', JSON.stringify(pagesToRemove));

  try {
    const res = await axios.post('/pdf/merge-with-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    });

    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error merging with preview:', err);
  } finally {
    loader.style.display = 'none';
  }
});
