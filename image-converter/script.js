// Bulk Image Converter Logic

const state = {
    files: [], // { id, file, status, blob, thumb }
    isConverting: false
};

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const btnConvert = document.getElementById('btn-convert');
const btnDownloadAll = document.getElementById('btn-download-all');
const btnClear = document.getElementById('btn-clear');

const formatSelect = document.getElementById('format-select');
const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
const qualitySection = document.getElementById('quality-section');
const maxWidthInput = document.getElementById('max-width');
const maxHeightInput = document.getElementById('max-height');

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
        fileInput.value = ''; // Reset
    });

    // Settings
    formatSelect.addEventListener('change', () => {
        if (formatSelect.value === 'image/png') {
            qualitySection.classList.add('hidden');
        } else {
            qualitySection.classList.remove('hidden');
        }
    });

    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = `${qualitySlider.value}%`;
    });

    // Actions
    btnConvert.addEventListener('click', convertAll);
    btnDownloadAll.addEventListener('click', downloadAll);
    btnClear.addEventListener('click', clearList);
}

// --- File Handling ---
function handleFiles(fileList) {
    const newFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    
    newFiles.forEach(file => {
        const id = Math.random().toString(36).substr(2, 9);
        const item = {
            id,
            file,
            status: 'pending',
            blob: null
        };
        state.files.push(item);
        addFileToUI(item);
        generateThumbnail(item);
    });

    updateButtons();
}

function addFileToUI(item) {
    const el = document.createElement('div');
    el.className = 'file-item';
    el.id = `file-${item.id}`;
    el.innerHTML = `
        <img src="" class="file-thumb" id="thumb-${item.id}">
        <div class="file-info">
            <div class="file-name" title="${item.file.name}">${item.file.name}</div>
            <div class="file-meta">${formatSize(item.file.size)}</div>
        </div>
        <div class="file-status" id="status-${item.id}">Pending</div>
        <button class="btn-remove" onclick="removeFile('${item.id}')">✕</button>
    `;
    fileList.appendChild(el);
}

function generateThumbnail(item) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById(`thumb-${item.id}`);
        if (img) img.src = e.target.result;
    };
    reader.readAsDataURL(item.file);
}

function removeFile(id) {
    state.files = state.files.filter(f => f.id !== id);
    const el = document.getElementById(`file-${id}`);
    if (el) el.remove();
    updateButtons();
}

function clearList() {
    state.files = [];
    fileList.innerHTML = '';
    updateButtons();
    btnDownloadAll.classList.add('hidden');
}

function updateButtons() {
    btnConvert.disabled = state.files.length === 0 || state.isConverting;
}

// --- Conversion Logic ---
async function convertAll() {
    if (state.isConverting) return;
    state.isConverting = true;
    updateButtons();
    btnConvert.textContent = 'Converting...';

    const format = formatSelect.value;
    const quality = parseInt(qualitySlider.value) / 100;
    const maxWidth = parseInt(maxWidthInput.value) || 0;
    const maxHeight = parseInt(maxHeightInput.value) || 0;

    for (const item of state.files) {
        if (item.status === 'done') continue;

        updateStatus(item.id, 'Converting...');
        try {
            const blob = await convertImage(item.file, format, quality, maxWidth, maxHeight);
            item.blob = blob;
            item.status = 'done';
            updateStatus(item.id, 'Done', 'status-done');
            
            // Update meta with new size
            const el = document.getElementById(`file-${item.id}`);
            if (el) {
                const meta = el.querySelector('.file-meta');
                meta.textContent = `${formatSize(item.file.size)} → ${formatSize(blob.size)}`;
            }
        } catch (err) {
            console.error(err);
            item.status = 'error';
            updateStatus(item.id, 'Error', 'status-error');
        }
    }

    state.isConverting = false;
    btnConvert.textContent = 'Convert All';
    btnDownloadAll.classList.remove('hidden');
    updateButtons();
}

function convertImage(file, format, quality, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width;
            let h = img.height;

            // Resize logic
            if (maxWidth > 0 && maxHeight > 0) {
                const ratio = Math.min(maxWidth / w, maxHeight / h);
                if (ratio < 1) {
                    w *= ratio;
                    h *= ratio;
                }
            } else if (maxWidth > 0 && w > maxWidth) {
                const ratio = maxWidth / w;
                w *= ratio;
                h *= ratio;
            } else if (maxHeight > 0 && h > maxHeight) {
                const ratio = maxHeight / h;
                w *= ratio;
                h *= ratio;
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Conversion failed'));
            }, format, quality);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

function updateStatus(id, text, className) {
    const el = document.getElementById(`status-${id}`);
    if (el) {
        el.textContent = text;
        if (className) {
            el.className = `file-status ${className}`;
        }
    }
}

// --- Download ---
async function downloadAll() {
    const zip = new JSZip();
    const format = formatSelect.value;
    const ext = format === 'image/webp' ? 'webp' : format === 'image/jpeg' ? 'jpg' : 'png';

    let count = 0;
    state.files.forEach(item => {
        if (item.status === 'done' && item.blob) {
            const originalName = item.file.name.replace(/\.[^/.]+$/, "");
            zip.file(`${originalName}.${ext}`, item.blob);
            count++;
        }
    });

    if (count === 0) return;

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'converted_images.zip';
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

// Expose removeFile globally
window.removeFile = removeFile;

init();
