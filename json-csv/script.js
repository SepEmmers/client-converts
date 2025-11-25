// JSON-CSV Converter Logic

// DOM Elements
const jsonInput = document.getElementById('json-input');
const csvInput = document.getElementById('csv-input');
const btnToCSV = document.getElementById('btn-to-csv');
const btnToJSON = document.getElementById('btn-to-json');
const tablePreview = document.getElementById('table-preview');

const fileJson = document.getElementById('file-json');
const fileCsv = document.getElementById('file-csv');

const btnCopyJson = document.getElementById('btn-copy-json');
const btnDownloadJson = document.getElementById('btn-download-json');
const btnCopyCsv = document.getElementById('btn-copy-csv');
const btnDownloadCsv = document.getElementById('btn-download-csv');

// --- Initialization ---
function init() {
    setupEventListeners();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Conversion
    btnToCSV.addEventListener('click', convertToCSV);
    btnToJSON.addEventListener('click', convertToJSON);

    // File Uploads
    fileJson.addEventListener('change', (e) => loadFile(e.target.files[0], jsonInput));
    fileCsv.addEventListener('change', (e) => loadFile(e.target.files[0], csvInput));

    // Copy/Download
    btnCopyJson.addEventListener('click', () => copyToClipboard(jsonInput.value));
    btnCopyCsv.addEventListener('click', () => copyToClipboard(csvInput.value));
    btnDownloadJson.addEventListener('click', () => downloadFile(jsonInput.value, 'data.json', 'application/json'));
    btnDownloadCsv.addEventListener('click', () => downloadFile(csvInput.value, 'data.csv', 'text/csv'));
}

// --- File Handling ---
function loadFile(file, targetInput) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        targetInput.value = e.target.result;
    };
    reader.readAsText(file);
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    } catch (err) {
        console.error(err);
    }
}

// --- Conversion Logic ---
function convertToCSV() {
    try {
        const json = JSON.parse(jsonInput.value);
        const csv = Papa.unparse(json);
        csvInput.value = csv;
        renderTable(json);
    } catch (err) {
        alert('Invalid JSON');
        console.error(err);
    }
}

function convertToJSON() {
    const csv = csvInput.value;
    Papa.parse(csv, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                console.warn(results.errors);
            }
            const json = JSON.stringify(results.data, null, 2);
            jsonInput.value = json;
            renderTable(results.data);
        }
    });
}

// --- Preview ---
function renderTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
        tablePreview.innerHTML = '<div class="empty-state">No data to display</div>';
        return;
    }

    // Get headers
    const headers = Object.keys(data[0]);
    
    let html = '<table><thead><tr>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';

    // Limit preview to 100 rows for performance
    const previewData = data.slice(0, 100);
    
    previewData.forEach(row => {
        html += '<tr>';
        headers.forEach(h => {
            let val = row[h];
            if (typeof val === 'object') val = JSON.stringify(val);
            html += `<td>${val}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    
    if (data.length > 100) {
        html += `<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">Showing first 100 of ${data.length} rows</div>`;
    }

    tablePreview.innerHTML = html;
}

init();
