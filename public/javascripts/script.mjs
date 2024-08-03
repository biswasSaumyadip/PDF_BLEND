document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('uploadForm');
  const loader = document.getElementById('loader');

  if (form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault(); // Prevent the default form submission

      loader.style.display = 'flex'; // Show the loader

      const fileInput = document.getElementById('fileInput');
      const files = fileInput.files;
      const formData = new FormData();

      for (const file of files) {
        if (['application/zip', 'application/x-zip-compressed'].includes(file.type)) {
          // If the file is a ZIP, process its contents
          const zip = new JSZip();
          try {
            const zipContent = await file.arrayBuffer();
            const zipData = await zip.loadAsync(zipContent);

            for (const filename of Object.keys(zipData.files)) {
              const zipFile = zipData.files[filename];
              if (zipFile.name.endsWith('.pdf')) {
                const blob = await zipFile.async('blob');
                formData.append('files', blob, zipFile.name);
              } else {
                console.warn(`File ${zipFile.name} is not a PDF and will be ignored.`);
              }
            }
          } catch (error) {
            console.error('Error processing ZIP file:', error);
          }
        } else if (file.type === 'application/pdf') {
          // If the file is a PDF, append it directly
          formData.append('files', file);
        } else {
          console.warn(`File ${file.name} is not a PDF or ZIP and will be ignored.`);
        }
      }

      const filename = document.getElementById('filename').value || 'merged.pdf';
      formData.append('filename', filename);

      try {
        const response = await axios.post('/pdf/merge', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: 'blob' // Expect binary data
        });

        // Create a link element to download the file
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);

      } catch (error) {
        console.error('Error uploading files:', error);
      } finally {
        loader.style.display = 'none'; // Hide the loader
      }
    });
  }
});