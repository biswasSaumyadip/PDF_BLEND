document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('uploadForm');
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');
  const fileList = document.getElementById('fileList');
  const browseBtn = document.getElementById('browseFiles');
  const previewContainer = document.getElementById('previewContainer');
  let pdfjsLib = window['pdfjs-dist/build/pdf'];

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // Handle drag and drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((event) => {
    dropZone.addEventListener(event, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ['dragenter', 'dragover'].forEach((event) => {
    dropZone.addEventListener(event, () => dropZone.classList.add('drag-over'));
  });

  ['dragleave', 'drop'].forEach((event) => {
    dropZone.addEventListener(event, () => dropZone.classList.remove('drag-over'));
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFiles();
    }
  });

  browseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', handleFiles);

  let pagesToRemove = {};

  async function handleFiles() {
    pagesToRemove = {};
    previewContainer.innerHTML = '';

    const files = fileInput.files;
    updateFileStatus(files.length);

    const previewGrid = document.createElement('div');
    previewGrid.className = 'preview-grid';
    previewContainer.appendChild(previewGrid);

    for (const file of files) {
      if (file.type === 'application/zip') {
        await handleZipFile(file, previewGrid);
      } else if (file.type === 'application/pdf') {
        await renderPDF(file, file.name, previewGrid);
      }
    }
  }

  function updateFileStatus(count) {
    fileList.innerHTML = `<p class="file-status">${count} file${count !== 1 ? 's' : ''} selected</p>`;
  }

  async function handleZipFile(file, container) {
    try {
      const zip = new JSZip();
      const zipContent = await file.arrayBuffer();
      const zipData = await zip.loadAsync(zipContent);

      for (const filename in zipData.files) {
        if (filename.toLowerCase().endsWith('.pdf')) {
          const pdfBlob = await zipData.files[filename].async('blob');
          await renderPDF(pdfBlob, filename, container);
        }
      }
    } catch (error) {
      console.error('Error processing ZIP:', error);
      showError('Failed to process ZIP file');
    }
  }

  async function renderPDF(file, filename, container) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      pagesToRemove[filename] = [];

      const fileContainer = document.createElement('div');
      fileContainer.className = 'file-container';

      const fileHeader = document.createElement('div');
      fileHeader.className = 'file-header';
      fileHeader.innerHTML = `<i class="fas fa-file-pdf"></i> ${filename}`;
      fileContainer.appendChild(fileHeader);

      const pagesGrid = document.createElement('div');
      pagesGrid.className = 'pages-grid';

      for (let i = 0; i < pdf.numPages; i++) {
        const pageWrapper = await createPagePreview(pdf, i, filename);
        pagesGrid.appendChild(pageWrapper);
      }

      fileContainer.appendChild(pagesGrid);
      container.appendChild(fileContainer);
    } catch (error) {
      console.error('Error rendering PDF:', error);
      showError('Failed to render PDF preview');
    }
  }

  async function createPagePreview(pdf, pageIndex, filename) {
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = 160 / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;

    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'pdf-page';
    pageWrapper.title = 'Click to toggle page selection';

    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise;

    const pageNumber = document.createElement('div');
    pageNumber.className = 'page-number';
    pageNumber.textContent = `Page ${pageIndex + 1}`;

    const removeToggle = document.createElement('div');
    removeToggle.className = 'remove-toggle';
    removeToggle.innerHTML = '<i class="fas fa-times"></i><span>Remove</span>';

    pageWrapper.appendChild(canvas);
    pageWrapper.appendChild(pageNumber);
    pageWrapper.appendChild(removeToggle);

    pageWrapper.addEventListener('click', () => {
      togglePageSelection(pageWrapper, pageIndex, filename);
      removeToggle.innerHTML = pageWrapper.classList.contains('selected')
        ? '<i class="fas fa-check"></i><span>Selected</span>'
        : '<i class="fas fa-times"></i><span>Remove</span>';
    });

    return pageWrapper;
  }

  function togglePageSelection(pageWrapper, pageIndex, filename) {
    if (!pagesToRemove[filename]) {
      pagesToRemove[filename] = [];
    }

    const isSelected = pageWrapper.classList.toggle('selected');

    if (isSelected) {
      pagesToRemove[filename].push(pageIndex);
      pageWrapper.setAttribute('aria-label', 'Selected for removal');
    } else {
      pagesToRemove[filename] = pagesToRemove[filename].filter((p) => p !== pageIndex);
      pageWrapper.setAttribute('aria-label', 'Click to select for removal');
    }
  }

  function showError(message) {
    const status = fileList.querySelector('.file-status');
    status.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    status.style.color = '#dc2626';
    setTimeout(() => {
      updateFileStatus(fileInput.files.length);
    }, 3000);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!fileInput.files.length) {
      showError('Please select at least one PDF file');
      return;
    }

    const loader = document.getElementById('loader');
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
      console.error('Error merging PDFs:', err);
      showError('Failed to merge PDFs. Please try again.');
    } finally {
      loader.style.display = 'none';
    }
  });
});
