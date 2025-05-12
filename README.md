# PDF Blend 🧩

A modern web application that simplifies PDF document management. With an intuitive user interface, PDF Blend makes it easy to perform common operations like merging files, removing pages, and fixing internal links.

## Features

### 1. PDF Merging

- Combine multiple PDF files into a single document
- Support for both simple merging and merging with preview
- Upload single or multiple PDFs
- Upload ZIP files containing PDFs
- Automatic sorting of PDFs with numeric prefixes (e.g., 1.pdf, 2.pdf, 10.pdf)

### 2. Visual Page Management

- Interactive page preview for all uploaded PDFs
- Visual page removal with real-time preview
- Drag-and-drop file upload support
- Customizable output filename

### 3. Advanced Features

- Fix internal PDF links and references
- Remove specific pages from PDFs
- Preserve PDF structure and interactive elements
- Handle ZIP archives containing multiple PDFs

### 4. User Interface

- Modern, intuitive interface
- Real-time visual feedback
- Progress indicators for operations
- Drag-and-drop support
- File upload previews
- Mobile-responsive design

## Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: Pug templates with modern CSS
- **PDF Processing**: pdf-lib for PDF manipulation
- **Additional Libraries**:
  - adm-zip: ZIP file handling
  - pdf.js: PDF preview and rendering
  - axios: HTTP client for AJAX requests

## Prerequisites

- Node.js (v20.11.1 or later)
- npm (v10.2.5 or later)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/biswasSaumyadip/PDF_BLEND
cd PDF-BLEND
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000` by default.

## API Endpoints

### PDF Merging

- `POST /pdf/merge`: Merge multiple PDFs
- `POST /pdf/merge-with-preview`: Merge PDFs with page removal options

### Page Operations

- `POST /pdf/remove`: Remove pages from a PDF
- `POST /pdf/fix-links`: Fix internal links in a PDF

## Development

### Project Structure

```
PDF-BLEND/
├── src/
│   ├── controller/      # Route handlers
│   ├── services/        # PDF processing logic
│   ├── middleware/      # Express middleware
│   ├── routes/         # API routes
│   ├── utils/          # Helper functions
│   └── views/          # Pug templates
├── public/
│   ├── javascripts/    # Client-side scripts
│   └── stylesheets/    # CSS files
└── tests/             # Unit tests
```

### Running Tests

```bash
npm test
```

## Error Handling

The application includes comprehensive error handling for:

- Invalid file uploads
- Corrupted PDF files
- Failed merge operations
- Invalid page removals
- ZIP file processing errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
