export class Loader {
  constructor() {
    this.loaderElement = document.getElementById('loader');
    this.progressElement = this.loaderElement?.querySelector('.progress-number');
    this.textElement = this.loaderElement?.querySelector('.loader-text');
    this.currentProgress = 0;
  }

  show(message = null) {
    if (this.loaderElement) {
      this.loaderElement.style.display = 'flex';
      if (message && this.textElement) {
        this.textElement.textContent = message;
      }
    }
  }

  hide() {
    if (this.loaderElement) {
      this.loaderElement.style.display = 'none';
      this.setProgress(0);
    }
  }

  setProgress(progress) {
    if (this.progressElement) {
      this.currentProgress = Math.min(Math.max(0, progress), 100);
      this.progressElement.textContent = Math.round(this.currentProgress);
    }
  }

  incrementProgress(amount = 10) {
    this.setProgress(this.currentProgress + amount);
  }
}

// Create a singleton instance
const loader = new Loader();
export default loader;
