console.log("htmlToImage exists?", !!window.htmlToImage);


function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseMarkup(raw) {
  let s = escapeHtml(raw);
  s = s.replaceAll('\n', '<br>');
  s = s.replace(/\[\[([\s\S]+?)\]\]/g, '<span class="hl-yellow">$1</span>');
  s = s.replace(/\{r:([\s\S]+?)\}/g, '<span class="hl-red">$1</span>');
  s = s.replace(/\{b:([\s\S]+?)\}/g, '<span class="hl-blue">$1</span>');
  return s;
}

const headlineInput = document.getElementById('headlineInput');
const headlineEl = document.getElementById('headline');

function updateHeadline() {
  headlineEl.innerHTML = parseMarkup(headlineInput.value);
}
headlineInput.addEventListener('input', updateHeadline);
updateHeadline();

const sourceTailInput = document.getElementById('sourceTailInput');
const sourceTailEl = document.getElementById('sourceTail');

function updateSourceTail() {
  sourceTailEl.textContent = sourceTailInput.value;
}
sourceTailInput.addEventListener('input', updateSourceTail);
updateSourceTail();

document.getElementById('imageInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('mainImage').src = reader.result; // dataURL = safe for export
  };
  reader.readAsDataURL(file);
});

async function waitForImages(node) {
  const imgs = node.querySelectorAll('img');

  await Promise.all([...imgs].map(img => {
    // If image missing (404), naturalWidth stays 0
    if (img.complete) return Promise.resolve();
    return new Promise(res => {
      img.onload = () => res();
      img.onerror = () => res();
    });
  }));

  // hard-check for broken images
  const broken = [...imgs].filter(i => i.naturalWidth === 0);
  if (broken.length) {
    const names = broken.map(b => b.getAttribute('src')).join('\n');
    throw new Error("Some images failed to load:\n" + names);
  }
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadPNG() {
  const node = document.getElementById('template');
  const btn = document.getElementById('downloadBtn');

  try {
    btn.disabled = true;
    btn.textContent = "Exporting...";

    // library check
    if (!window.htmlToImage) {
    throw new Error("html-to-image not found. Make sure ./vendor/html-to-image.min.js is loaded.");
    }


    // wait for fonts (Bangla)
    if (document.fonts?.ready) await document.fonts.ready;

    // wait for images + ensure none broken
    await waitForImages(node);

    const dataUrl = await window.htmlToImage.toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    });

    downloadDataUrl(dataUrl, 'news-template.png');

  } catch (err) {
    console.error("PNG export failed:", err);

    // SHOW REAL ERROR MESSAGE
    alert("Download failed:\n\n" + (err?.message || err));

  } finally {
    btn.disabled = false;
    btn.textContent = "Download PNG";
  }
}

document.getElementById('downloadBtn').addEventListener('click', downloadPNG);
window.downloadPNG = downloadPNG;
