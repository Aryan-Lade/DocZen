// Central registry of every tool the backend exposes.
// The generic ToolRunner page renders a tool purely from this config.

export type FieldType = 'text' | 'number' | 'select' | 'color' | 'textarea' | 'range';

export interface ToolField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[]; // for select
  min?: number;
  max?: number;
  step?: number;
  // Only show this field when another field has a specific value
  showWhen?: { field: string; equals: string };
}

export interface Tool {
  slug: string;
  name: string;
  shortDesc: string;
  icon: string;
  iconBg: string;
  category: 'pdf' | 'image' | 'convert' | 'ai' | 'text';
  endpoint: string;
  // 'single' | 'multi' | 'none' (no file — e.g. paste text)
  fileMode: 'single' | 'multi' | 'none' | 'optional';
  accept: string;
  fileFieldName: string; // multer field name: 'file' or 'files'
  minFiles?: number;
  fields: ToolField[];
  // How to handle the response
  responseType: 'download' | 'json';
  downloadName?: string;
  // For json responses that may include a `files` list (split/pdf-to-image)
  resultKind?: 'ocr' | 'language' | 'filelist' | 'generic';
  helpText?: string;
}

export const TOOLS: Tool[] = [
  // ================= PDF =================
  {
    slug: 'pdf-merge',
    name: 'Merge PDF',
    shortDesc: 'Combine multiple PDFs into one',
    icon: '🔗',
    iconBg: '#eeeefc',
    category: 'pdf',
    endpoint: '/api/pdf/merge',
    fileMode: 'multi',
    accept: '.pdf',
    fileFieldName: 'files',
    minFiles: 2,
    fields: [],
    responseType: 'download',
    downloadName: 'merged.pdf',
    helpText: 'Upload 2 or more PDF files. They will be merged in the order shown.',
  },
  {
    slug: 'pdf-split',
    name: 'Split PDF',
    shortDesc: 'Extract pages or split into files',
    icon: '✂️',
    iconBg: '#fdf3e3',
    category: 'pdf',
    endpoint: '/api/pdf/split',
    fileMode: 'single',
    accept: '.pdf',
    fileFieldName: 'file',
    fields: [
      {
        name: 'mode', label: 'Split mode', type: 'select', defaultValue: 'range',
        options: [
          { value: 'range', label: 'Page range (one PDF)' },
          { value: 'custom', label: 'Custom pages (one PDF)' },
          { value: 'every', label: 'Every page (separate PDFs)' },
        ],
      },
      { name: 'startPage', label: 'Start page', type: 'number', defaultValue: '1', min: 1, showWhen: { field: 'mode', equals: 'range' } },
      { name: 'endPage', label: 'End page', type: 'number', placeholder: 'e.g. 5', min: 1, showWhen: { field: 'mode', equals: 'range' } },
      { name: 'pages', label: 'Pages (comma separated)', type: 'text', placeholder: 'e.g. 1,3,5', showWhen: { field: 'mode', equals: 'custom' } },
    ],
    responseType: 'download',
    downloadName: 'split.pdf',
    resultKind: 'filelist',
  },
  {
    slug: 'pdf-compress',
    name: 'Compress PDF',
    shortDesc: 'Reduce PDF file size',
    icon: '🗜️',
    iconBg: '#eafaf0',
    category: 'pdf',
    endpoint: '/api/pdf/compress',
    fileMode: 'single',
    accept: '.pdf',
    fileFieldName: 'file',
    fields: [],
    responseType: 'download',
    downloadName: 'compressed.pdf',
  },
  {
    slug: 'pdf-protect',
    name: 'Protect PDF',
    shortDesc: 'Add password encryption',
    icon: '🔒',
    iconBg: '#fdeeee',
    category: 'pdf',
    endpoint: '/api/pdf/protect',
    fileMode: 'single',
    accept: '.pdf',
    fileFieldName: 'file',
    fields: [
      { name: 'password', label: 'Password', type: 'text', placeholder: 'Set a strong password' },
    ],
    responseType: 'download',
    downloadName: 'protected.pdf',
  },
  {
    slug: 'pdf-unlock',
    name: 'Unlock PDF',
    shortDesc: 'Remove password (authorized files)',
    icon: '🔓',
    iconBg: '#eefbf7',
    category: 'pdf',
    endpoint: '/api/pdf/unlock',
    fileMode: 'single',
    accept: '.pdf',
    fileFieldName: 'file',
    fields: [],
    responseType: 'download',
    downloadName: 'unlocked.pdf',
    helpText: 'Only unlock PDFs you own or are authorized to modify.',
  },
  {
    slug: 'pdf-reorder',
    name: 'Reorder Pages',
    shortDesc: 'Rearrange pages in a new order',
    icon: '🔀',
    iconBg: '#f0edfc',
    category: 'pdf',
    endpoint: '/api/pdf/reorder',
    fileMode: 'single',
    accept: '.pdf',
    fileFieldName: 'file',
    fields: [
      { name: 'orderText', label: 'New page order', type: 'text', placeholder: 'e.g. 3,1,2', hint: 'Comma separated page numbers in the new order' },
    ],
    responseType: 'download',
    downloadName: 'reordered.pdf',
  },
  {
    slug: 'pdf-rotate',
    name: 'Rotate Pages',
    shortDesc: 'Rotate all or selected pages',
    icon: '🔄',
    iconBg: '#e8f4fd',
    category: 'pdf',
    endpoint: '/api/pdf/rotate',
    fileMode: 'single',
    accept: '.pdf',
    fileFieldName: 'file',
    fields: [
      {
        name: 'angle', label: 'Rotation', type: 'select', defaultValue: '90',
        options: [
          { value: '90', label: '90° clockwise' },
          { value: '180', label: '180°' },
          { value: '270', label: '90° counter-clockwise' },
        ],
      },
      { name: 'pages', label: 'Pages', type: 'text', defaultValue: 'all', hint: '"all" or comma separated e.g. 1,3,5' },
    ],
    responseType: 'download',
    downloadName: 'rotated.pdf',
  },
  {
    slug: 'pdf-watermark',
    name: 'Add Watermark',
    shortDesc: 'Stamp text watermark on pages',
    icon: '💧',
    iconBg: '#e8f4fd',
    category: 'pdf',
    endpoint: '/api/pdf/watermark',
    fileMode: 'single',
    accept: '.pdf',
    fileFieldName: 'file',
    fields: [
      { name: 'text', label: 'Watermark text', type: 'text', defaultValue: 'CONFIDENTIAL' },
      {
        name: 'position', label: 'Position', type: 'select', defaultValue: 'center',
        options: [
          { value: 'center', label: 'Center' },
          { value: 'top-left', label: 'Top left' },
          { value: 'top-right', label: 'Top right' },
          { value: 'bottom-left', label: 'Bottom left' },
          { value: 'bottom-right', label: 'Bottom right' },
        ],
      },
      { name: 'fontSize', label: 'Font size', type: 'number', defaultValue: '60', min: 8, max: 200 },
      { name: 'opacity', label: 'Opacity (0–1)', type: 'number', defaultValue: '0.3', min: 0, max: 1, step: 0.05 },
      { name: 'color', label: 'Color', type: 'color', defaultValue: '#cccccc' },
    ],
    responseType: 'download',
    downloadName: 'watermarked.pdf',
  },
  {
    slug: 'pdf-page-numbers',
    name: 'Page Numbers',
    shortDesc: 'Add page numbers to a PDF',
    icon: '🔢',
    iconBg: '#fdf3e3',
    category: 'pdf',
    endpoint: '/api/pdf/number-pages',
    fileMode: 'single',
    accept: '.pdf',
    fileFieldName: 'file',
    fields: [
      {
        name: 'position', label: 'Position', type: 'select', defaultValue: 'bottom-center',
        options: [
          { value: 'bottom-center', label: 'Bottom center' },
          { value: 'bottom-left', label: 'Bottom left' },
          { value: 'bottom-right', label: 'Bottom right' },
          { value: 'top-center', label: 'Top center' },
          { value: 'top-left', label: 'Top left' },
          { value: 'top-right', label: 'Top right' },
        ],
      },
      {
        name: 'style', label: 'Style', type: 'select', defaultValue: 'numeric',
        options: [
          { value: 'numeric', label: '1, 2, 3…' },
          { value: 'roman', label: 'I, II, III…' },
        ],
      },
      { name: 'fontSize', label: 'Font size', type: 'number', defaultValue: '12', min: 6, max: 48 },
      { name: 'color', label: 'Color', type: 'color', defaultValue: '#000000' },
    ],
    responseType: 'download',
    downloadName: 'numbered.pdf',
  },

  // ================= IMAGE =================
  {
    slug: 'image-compress',
    name: 'Compress Image',
    shortDesc: 'Shrink image size with quality control',
    icon: '🖼️',
    iconBg: '#eafaf0',
    category: 'image',
    endpoint: '/api/image/compress',
    fileMode: 'single',
    accept: 'image/*',
    fileFieldName: 'file',
    fields: [
      { name: 'quality', label: 'Quality (1–100)', type: 'number', defaultValue: '80', min: 1, max: 100 },
    ],
    responseType: 'download',
    downloadName: 'compressed.jpg',
  },
  {
    slug: 'image-convert',
    name: 'Convert Image',
    shortDesc: 'JPG, PNG, WEBP, BMP, TIFF',
    icon: '🎨',
    iconBg: '#f0edfc',
    category: 'image',
    endpoint: '/api/image/convert',
    fileMode: 'single',
    accept: 'image/*',
    fileFieldName: 'file',
    fields: [
      {
        name: 'format', label: 'Target format', type: 'select', defaultValue: 'png',
        options: [
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPG' },
          { value: 'webp', label: 'WEBP' },
          { value: 'bmp', label: 'BMP' },
          { value: 'tiff', label: 'TIFF' },
        ],
      },
    ],
    responseType: 'download',
    downloadName: 'converted.png',
  },
  {
    slug: 'pdf-to-image',
    name: 'PDF to Images',
    shortDesc: 'Convert each page to JPG',
    icon: '📸',
    iconBg: '#e8f4fd',
    category: 'image',
    endpoint: '/api/image/pdf-to-image',
    fileMode: 'single',
    accept: '.pdf',
    fileFieldName: 'file',
    fields: [],
    responseType: 'json',
    resultKind: 'filelist',
    helpText: 'Requires Ghostscript on the server.',
  },

  // ================= CONVERT =================
  {
    slug: 'text-to-pdf',
    name: 'Text to PDF',
    shortDesc: 'Turn a .txt file into a PDF',
    icon: '📝',
    iconBg: '#eeeefc',
    category: 'convert',
    endpoint: '/api/convert/text-to-pdf',
    fileMode: 'single',
    accept: '.txt',
    fileFieldName: 'file',
    fields: [],
    responseType: 'download',
    downloadName: 'converted.pdf',
  },
  {
    slug: 'office-to-pdf',
    name: 'Office to PDF',
    shortDesc: 'Word, Excel, PowerPoint → PDF',
    icon: '📊',
    iconBg: '#eafaf0',
    category: 'convert',
    endpoint: '/api/convert/office-to-pdf',
    fileMode: 'single',
    accept: '.doc,.docx,.xls,.xlsx,.ppt,.pptx',
    fileFieldName: 'file',
    fields: [],
    responseType: 'download',
    downloadName: 'converted.pdf',
    helpText: 'Requires LibreOffice on the server.',
  },
  {
    slug: 'html-to-pdf',
    name: 'HTML to PDF',
    shortDesc: 'Convert an HTML file to PDF',
    icon: '🌐',
    iconBg: '#fdf3e3',
    category: 'convert',
    endpoint: '/api/convert/html-to-pdf',
    fileMode: 'single',
    accept: '.html,.htm',
    fileFieldName: 'file',
    fields: [],
    responseType: 'download',
    downloadName: 'converted.pdf',
  },

  // ================= AI / TEXT =================
  {
    slug: 'ocr',
    name: 'OCR — Extract Text',
    shortDesc: 'Read text from images & scans',
    icon: '👁️',
    iconBg: '#f0edfc',
    category: 'text',
    endpoint: '/api/ocr/extract',
    fileMode: 'single',
    accept: 'image/*,.pdf',
    fileFieldName: 'file',
    fields: [
      {
        name: 'lang', label: 'Document language', type: 'select', defaultValue: 'eng',
        options: [
          { value: 'eng', label: 'English' },
          { value: 'hin', label: 'Hindi' },
          { value: 'spa', label: 'Spanish' },
          { value: 'fra', label: 'French' },
          { value: 'deu', label: 'German' },
          { value: 'ara', label: 'Arabic' },
          { value: 'chi_sim', label: 'Chinese (Simplified)' },
        ],
      },
    ],
    responseType: 'json',
    resultKind: 'ocr',
  },
  {
    slug: 'language-detect',
    name: 'Language Detection',
    shortDesc: 'Detect language of text or files',
    icon: '🌍',
    iconBg: '#e8f4fd',
    category: 'text',
    endpoint: '/api/language/detect',
    fileMode: 'optional',
    accept: '.txt,.html,.htm,.pdf',
    fileFieldName: 'file',
    fields: [
      { name: 'text', label: 'Or paste text here', type: 'textarea', placeholder: 'Paste at least 10 characters of text…' },
    ],
    responseType: 'json',
    resultKind: 'language',
    helpText: 'Upload a TXT/HTML/PDF file, or paste text directly. Detects 180+ languages offline.',
  },
];

export const CATEGORIES: { key: Tool['category']; label: string; icon: string }[] = [
  { key: 'pdf', label: 'PDF Tools', icon: '📄' },
  { key: 'image', label: 'Image Tools', icon: '🖼️' },
  { key: 'convert', label: 'File Conversion', icon: '🔁' },
  { key: 'text', label: 'Text & AI', icon: '🤖' },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);
