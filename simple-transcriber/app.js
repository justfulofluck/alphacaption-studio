const API_BASE = 'http://localhost:5000/api';

const uploadArea = document.getElementById('uploadArea');
const audioInput = document.getElementById('audioInput');
const languageSelect = document.getElementById('languageSelect');
const transcribeBtn = document.getElementById('transcribeBtn');
const status = document.getElementById('status');
const spinner = document.getElementById('spinner');

let selectedFile = null;

uploadArea.addEventListener('click', () => audioInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('audio/')) {
    handleFile(file);
  }
});

audioInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  selectedFile = file;
  uploadArea.classList.add('has-file');
  uploadArea.querySelector('.upload-text').textContent = file.name;
  transcribeBtn.disabled = false;
  hideStatus();
}

transcribeBtn.addEventListener('click', transcribe);

async function transcribe() {
  if (!selectedFile) return;

  transcribeBtn.disabled = true;
  transcribeBtn.classList.add('loading');
  transcribeBtn.textContent = 'Transcribing...';
  spinner.hidden = false;

  try {
    const formData = new FormData();
    formData.append('audio', selectedFile);
    formData.append('language', languageSelect.value);

    const res = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Transcription failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();

    if (!data.segments || !data.segments.length) {
      throw new Error('No segments produced');
    }

    downloadSrt(data.segments, selectedFile.name);
    showStatus('SRT downloaded', 'success');

  } catch (err) {
    showStatus(err.message, 'error');
  } finally {
    spinner.hidden = true;
    transcribeBtn.disabled = false;
    transcribeBtn.classList.remove('loading');
    transcribeBtn.textContent = 'Transcribe';
  }
}

function downloadSrt(segments, fileName) {
  const srtLines = [];
  segments.forEach((seg, i) => {
    srtLines.push(String(i + 1));
    srtLines.push(`${toSrtTime(seg.start)} --> ${toSrtTime(seg.end)}`);
    srtLines.push(seg.text);
    srtLines.push('');
  });

  const blob = new Blob([srtLines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace(/\.[^/.]+$/, '') + '.srt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toSrtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function showStatus(msg, type) {
  status.hidden = false;
  status.textContent = msg;
  status.className = 'status' + (type ? ' ' + type : '');
}

function hideStatus() {
  status.hidden = true;
  status.className = 'status';
}
