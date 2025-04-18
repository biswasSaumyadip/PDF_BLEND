export class FileUploader {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.options = {
      multiple: true,
      accept: '',
      ...options,
    };

    this.files = new Set();
    this.events = new Map();
    this.init();
  }

  init() {
    this.uploadArea = this.container.querySelector('.upload-area');
    this.fileInput = this.container.querySelector('.file-input');
    this.fileList = this.container.querySelector('.file-list');
    this.browseBtn = this.container.querySelector('.browse-btn');

    this.setupDragAndDrop();
    this.setupFileInput();
    this.setupEventListeners();
  }

  setupDragAndDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((event) => {
      this.uploadArea.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach((event) => {
      this.uploadArea.addEventListener(event, () => {
        this.uploadArea.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((event) => {
      this.uploadArea.addEventListener(event, () => {
        this.uploadArea.classList.remove('drag-over');
      });
    });

    this.uploadArea.addEventListener('drop', (e) => {
      const droppedFiles = Array.from(e.dataTransfer.files);
      this.handleFiles(droppedFiles);
    });
  }

  setupFileInput() {
    if (this.options.accept) {
      this.fileInput.setAttribute('accept', this.options.accept);
    }
    this.fileInput.multiple = this.options.multiple;
  }

  setupEventListeners() {
    this.browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', () => {
      this.handleFiles(Array.from(this.fileInput.files));
    });
  }

  handleFiles(newFiles) {
    this.files = new Set(newFiles);
    this.updateStatus();
    this.emit('change', Array.from(this.files));
  }

  updateStatus() {
    const count = this.files.size;
    const status = this.fileList.querySelector('.file-status');
    status.textContent = `${count} file${count !== 1 ? 's' : ''} selected`;
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);
  }

  off(event, callback) {
    if (this.events.has(event)) {
      this.events.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach((callback) => callback(data));
    }
  }

  getFiles() {
    return Array.from(this.files);
  }

  clear() {
    this.files.clear();
    this.updateStatus();
    this.emit('change', []);
  }
}

// Initialize all file uploaders on the page
export function initFileUploaders() {
  document.querySelectorAll('[data-uploader]').forEach((container) => {
    const uploader = new FileUploader(container);
    container.fileUploader = uploader;
  });
}
