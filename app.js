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

// ===== Headline =====
const headlineInput = document.getElementById('headlineInput');
const headlineEl = document.getElementById('headline');

function updateHeadline() {
  headlineEl.innerHTML = parseMarkup(headlineInput.value);
}
headlineInput.addEventListener('input', updateHeadline);
updateHeadline();

// ===== Source Tail =====
const sourceTailInput = document.getElementById('sourceTailInput');
const sourceTailEl = document.getElementById('sourceTail');

function updateSourceTail() {
  sourceTailEl.textContent = sourceTailInput.value;
}
sourceTailInput.addEventListener('input', updateSourceTail);
updateSourceTail();

// ===== Image Upload =====
document.getElementById('imageInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('mainImage').src = reader.result; // dataURL
  };
  reader.readAsDataURL(file);
});

// ===== Helpers =====
async function waitForImages(node) {
  const imgs = node.querySelectorAll('img');

  await Promise.all([...imgs].map(img => {
    // already loaded
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();

    return new Promise(res => {
      img.onload = () => res();
      img.onerror = () => res(); // don't block forever
    });
  }));

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

// ✅ Export-safe PNG (ignores mobile scaling by exporting a clone)
async function downloadPNG() {
  const btn = document.getElementById('downloadBtn');
  const original = document.getElementById('template');

  try {
    btn.disabled = true;
    btn.textContent = "Exporting...";

    if (!window.htmlToImage) {
      throw new Error("html-to-image not found. Make sure ./vendor/html-to-image.js is loaded.");
    }

    // Wait for Bangla font rendering
    if (document.fonts?.ready) await document.fonts.ready;

    // Create offscreen host (no scaling parents)
    const exportHost = document.createElement('div');
    exportHost.style.position = 'fixed';
    exportHost.style.left = '-100000px';
    exportHost.style.top = '0';
    exportHost.style.width = '1080px';
    exportHost.style.height = '1350px';
    exportHost.style.background = '#ffffff';
    exportHost.style.zIndex = '-1';

    // Clone template
    const clone = original.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.width = '1080px';
    clone.style.height = '1350px';

    exportHost.appendChild(clone);
    document.body.appendChild(exportHost);

    // Copy live content into clone (important for current edits)
    const origHeadline = original.querySelector('#headline');
    const cloneHeadline = clone.querySelector('#headline');
    if (origHeadline && cloneHeadline) cloneHeadline.innerHTML = origHeadline.innerHTML;

    const origSourceTail = original.querySelector('#sourceTail');
    const cloneSourceTail = clone.querySelector('#sourceTail');
    if (origSourceTail && cloneSourceTail) cloneSourceTail.textContent = origSourceTail.textContent;

    const origMainImg = original.querySelector('#mainImage');
    const cloneMainImg = clone.querySelector('#mainImage');
    if (origMainImg && cloneMainImg) cloneMainImg.src = origMainImg.src;

    // Wait for images inside clone
    await waitForImages(clone);

    // Export clone at fixed size (always correct)
    const dataUrl = await window.htmlToImage.toPng(clone, {
      cacheBust: true,
      pixelRatio: 2, // change to 3 for sharper output
      backgroundColor: '#ffffff'
    });

    downloadDataUrl(dataUrl, 'news-template.png');

    // Cleanup
    exportHost.remove();

  } catch (err) {
    console.error("PNG export failed:", err);
    alert("Download failed:\n\n" + (err?.message || err));
  } finally {
    btn.disabled = false;
    btn.textContent = "Download PNG";
  }
}

document.getElementById('downloadBtn').addEventListener('click', downloadPNG);
window.downloadPNG = downloadPNG;
