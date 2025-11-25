// Secure PDF Merger Logic

const state = {
    files: [], // { id, file }
    isMerging: false
};

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const controls = document.getElementById('controls');
const btnMerge = document.getElementById('btn-merge');
const btnClear = document.getElementById('btn-clear');

// --- Initialization ---
function init() {
    setupEventListeners();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = '';
    });

    // Actions
    btnMerge.addEventListener('click', mergePDFs);
    btnClear.addEventListener('click', clearList);
}

// --- File Handling ---
function handleFiles(fileList) {
    const newFiles = Array.from(fileList).filter(f => f.type === 'application/pdf');
    
    newFiles.forEach(file => {
        const id = Math.random().toString(36).substr(2, 9);
        state.files.push({ id, file });
    });

    renderList();
    updateUI();
}

function renderList() {
    fileList.innerHTML = '';
    state.files.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'file-item';
        el.innerHTML = `
            <div class="pdf-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </div>
            <div class="file-info">
                <div class="file-name">${item.file.name}</div>
                <div class="file-size">${formatSize(item.file.size)}</div>
            </div>
            <div class="file-actions">
                <button class="btn-icon" onclick="moveUp(${index})" ${index === 0 ? 'disabled' : ''} title="Move Up">↑</button>
                <button class="btn-icon" onclick="moveDown(${index})" ${index === state.files.length - 1 ? 'disabled' : ''} title="Move Down">↓</button>
                <button class="btn-icon btn-remove" onclick="removeFile('${item.id}')" title="Remove">✕</button>
            </div>
        `;
        fileList.appendChild(el);
    });
}

function updateUI() {
    if (state.files.length > 0) {
        controls.classList.remove('hidden');
    } else {
        controls.classList.add('hidden');
    }
    btnMerge.disabled = state.files.length < 2 || state.isMerging;
}

function removeFile(id) {
    state.files = state.files.filter(f => f.id !== id);
    renderList();
    updateUI();
}

function clearList() {
    state.files = [];
    renderList();
    updateUI();
}

function moveUp(index) {
    if (index > 0) {
        const temp = state.files[index];
        state.files[index] = state.files[index - 1];
        state.files[index - 1] = temp;
        renderList();
    }
}

function moveDown(index) {
    if (index < state.files.length - 1) {
        const temp = state.files[index];
        state.files[index] = state.files[index + 1];
        state.files[index + 1] = temp;
        renderList();
    }
}

// --- Merge Logic ---
async function mergePDFs() {
    if (state.isMerging) return;
    state.isMerging = true;
    updateUI();
    btnMerge.textContent = 'Merging...';

    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const item of state.files) {
            const arrayBuffer = await item.file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        downloadPDF(mergedPdfBytes, 'merged-document.pdf');
    } catch (err) {
        console.error(err);
        alert('Failed to merge PDFs. Please ensure files are valid.');
    }

    state.isMerging = false;
    btnMerge.textContent = 'Merge PDFs';
    updateUI();
}

function downloadPDF(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// --- Helpers ---
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Expose functions globally
window.removeFile = removeFile;
window.moveUp = moveUp;
window.moveDown = moveDown;

init();
