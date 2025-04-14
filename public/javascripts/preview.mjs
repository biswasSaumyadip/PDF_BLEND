const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("previewContainer");
const form = document.getElementById("uploadForm");

const pagesToRemove = {}; // { 0: [0,2], 1: [1], ... }

fileInput.addEventListener("change", async (e) => {
  previewContainer.innerHTML = "";

  const files = Array.from(e.target.files);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const container = document.createElement("div");
    container.className = "pdf-file";
    container.innerHTML = `<h3>${file.name}</h3>`;
    previewContainer.appendChild(container);

    pagesToRemove[i] = [];

    for (let j = 0; j < pdf.numPages; j++) {
      const page = await pdf.getPage(j + 1);
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.fileIndex = i;
      checkbox.dataset.pageNumber = j;

      checkbox.addEventListener("change", () => {
        const fileIdx = +checkbox.dataset.fileIndex;
        const pageNum = +checkbox.dataset.pageNumber;

        if (checkbox.checked) {
          if (!pagesToRemove[fileIdx]) pagesToRemove[fileIdx] = [];
          pagesToRemove[fileIdx].push(pageNum);
        } else {
          pagesToRemove[fileIdx] = pagesToRemove[fileIdx].filter((p) => p !== pageNum);
        }
      });

      const label = document.createElement("label");
      label.textContent = `Remove Page ${j + 1}`;
      label.style.display = "block";
      label.appendChild(checkbox);

      const pageDiv = document.createElement("div");
      pageDiv.style.display = "inline-block";
      pageDiv.style.margin = "10px";
      pageDiv.style.textAlign = "center";

      pageDiv.appendChild(canvas);
      pageDiv.appendChild(label);
      container.appendChild(pageDiv);
    }
  }
});

form.addEventListener("submit", (e) => {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "pagesToRemove";
  input.value = JSON.stringify(pagesToRemove);
  form.appendChild(input);
});
