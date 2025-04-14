const fileInput = document.getElementById('fileInput');
const form = document.getElementById('uploadForm');
const previewContainer = document.getElementById('previewContainer');

let pagesToRemove = [];

fileInput.addEventListener('change', async (e) => {
  previewContainer.innerHTML = '';
  pagesToRemove = [];

  const file = e.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const container = document.createElement('div');
  container.className = 'pdf-file';
  container.innerHTML = `<h3>${file.name}</h3>`;
  previewContainer.appendChild(container);

  for (let j = 0; j < pdf.numPages; j++) {
    const page = await pdf.getPage(j + 1);
    const viewport = page.getViewport({ scale: 0.3 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.pageNumber = j;

    checkbox.addEventListener('change', () => {
      const pageNum = +checkbox.dataset.pageNumber;
      if (checkbox.checked) {
        pagesToRemove.push(pageNum);
      } else {
        pagesToRemove = pagesToRemove.filter((p) => p !== pageNum);
      }
    });

    const label = document.createElement('label');
    label.textContent = `Remove Page ${j + 1}`;
    label.style.display = 'block';
    label.appendChild(checkbox);

    const pageDiv = document.createElement('div');
    pageDiv.style.display = 'inline-block';
    pageDiv.style.margin = '10px';
    pageDiv.style.textAlign = 'center';

    pageDiv.appendChild(canvas);
    pageDiv.appendChild(label);
    container.appendChild(pageDiv);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault(); // prevent native form submission

  const file = fileInput.files[0];
  const filename = document.getElementById('filename').value || 'CleanedFile.pdf';

  if (!file) {
    alert('Please upload a PDF first.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('filename', filename);
  formData.append('pagesToRemove', JSON.stringify(pagesToRemove));

  try {
    const response = await fetch('/pdf/remove', {
      method: 'POST',
      body: formData,
    });

    const blob = await response.blob();

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = filename;
    downloadLink.click();

    // ✅ Clear everything after download
    form.reset();
    previewContainer.innerHTML = '';
    pagesToRemove = [];
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Something went wrong.');
  }
});
