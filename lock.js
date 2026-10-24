// Экран блокировки: ковёр из цветных ASCII-символов, по которому мягко стекают струи «данных»,
// проявляя узор ярче. Плюс расшифровка фото паролем.
(() => {
  const RAMP = " .`'^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const RAIN = ".:;~+*1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao#%&@";

  const lock = document.getElementById('lock');
  const rain = document.getElementById('rain');
  const form = document.getElementById('lock-form');
  const input = document.getElementById('lock-pass');
  const msg = document.getElementById('lock-msg');
  const rctx = rain.getContext('2d');
  const base = document.createElement('canvas'), bctx = base.getContext('2d');
  let W, H, FS, CWr, cols, rows, cells, drops, carpet = null, running = true;

  const randChar = () => RAIN[(Math.random() * RAIN.length) | 0];
  const newDrop = top => ({
    y: top ? -Math.random() * rows * .6 : Math.random() * rows,
    v: .05 + Math.random() * .1,
    len: 6 + (Math.random() * 12 | 0),
    on: Math.random() < .45
  });

  // Ковёр вписывается в сетку символов «cover»; на широком экране поворачивается боком
  function placeCarpet(x) {
    const rot = W > H;
    const iw = rot ? carpet.height : carpet.width, ih = rot ? carpet.width : carpet.height;
    const k = Math.max(W / iw, H / ih);
    x.translate(W / 2, H / 2);
    if (rot) x.rotate(Math.PI / 2);
    x.imageSmoothingQuality = 'high';
    x.drawImage(carpet, -carpet.width * k / 2, -carpet.height * k / 2, carpet.width * k, carpet.height * k);
  }

  function sampleCarpet() {
    const g = document.createElement('canvas');
    g.width = cols; g.height = rows;
    const x = g.getContext('2d');
    x.setTransform(1 / CWr, 0, 0, 1 / FS, 0, 0);
    placeCarpet(x);
    const d = x.getImageData(0, 0, cols, rows).data;
    const lum = p => (.299 * d[p] + .587 * d[p + 1] + .114 * d[p + 2]) / 255 * .45 + Math.max(d[p], d[p + 1], d[p + 2]) / 255 * .55;
    // ковёр тёмный — растягиваем яркость на весь диапазон символов, иначе узор не читается
    let lo = 1, hi = 0;
    for (let p = 0; p < d.length; p += 4) { const l = lum(p); lo = Math.min(lo, l); hi = Math.max(hi, l); }
    cells = [];
    for (let p = 0; p < d.length; p += 4) {
      const r = d[p], gg = d[p + 1], b = d[p + 2], mx = Math.max(r, gg, b, 1);
      const l = .08 + .92 * (lum(p) - lo) / Math.max(.01, hi - lo);
      // настоящий контраст ковра: синие и тёмные поля остаются тёмными, кремовый узор — светлым
      const m = Math.min(2.2, 255 / mx);
      const c = [r * m | 0, gg * m | 0, b * m | 0];
      cells.push({
        // кривая 1.3: тёмный фон — лёгкие символы, светлый узор и медальон — плотные
        l, ch: RAMP[Math.min(RAMP.length - 1, 1 + (Math.pow(l, 1.3) * (RAMP.length - 1)) | 0)],
        col: `rgb(${c[0]},${c[1]},${c[2]})`,
        head: `rgb(${(c[0] + 244) / 2 | 0},${(c[1] + 232) / 2 | 0},${(c[2] + 218) / 2 | 0})`,
        rc: randChar()
      });
    }
    // подложка: едва видное фото ковра даёт объём ворса, поверх — символы узора
    bctx.fillStyle = '#000'; bctx.fillRect(0, 0, W, H);
    bctx.save(); bctx.globalAlpha = .42; placeCarpet(bctx); bctx.restore();
    bctx.font = `bold ${FS}px Consolas, "Courier New", monospace`;
    bctx.textBaseline = 'top';
    bctx.globalAlpha = 1;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const c = cells[j * cols + i];
      if (c.l < .05) continue;
      bctx.fillStyle = c.col;
      bctx.fillText(c.ch, i * CWr, j * FS);
    }
    bctx.globalAlpha = 1;
  }

  function resize() {
    const DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    rain.width = base.width = W * DPR; rain.height = base.height = H * DPR;
    rctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    FS = W < 600 ? 8 : Math.max(9, Math.min(11, W / 190 / .6)); CWr = FS * .6;
    cols = Math.ceil(W / CWr); rows = Math.ceil(H / FS);
    drops = Array.from({ length: cols }, () => newDrop(false));
    if (carpet) sampleCarpet();
  }
  addEventListener('resize', resize);
  resize();

  function tick() {
    if (!running) return;
    if (!cells) { requestAnimationFrame(tick); return; }
    rctx.drawImage(base, 0, 0, W, H);
    rctx.font = `bold ${FS}px Consolas, "Courier New", monospace`;
    rctx.textBaseline = 'top';
    for (let i = 0; i < cols; i++) {
      const d = drops[i];
      d.y += d.v;
      if (d.y - d.len > rows) { drops[i] = newDrop(true); continue; }
      if (!d.on) continue;
      const head = Math.floor(d.y);
      for (let k = 0; k < d.len; k++) {
        const row = head - k;
        if (row < 0 || row >= rows) continue;
        const c = cells[row * cols + i];
        if (Math.random() < .02) c.rc = randChar();
        const x = i * CWr, y = row * FS;
        rctx.globalAlpha = .85;
        rctx.fillStyle = '#000'; rctx.fillRect(x, y, CWr, FS);
        // струя не стирает узор: новые символы только в голове, дальше — символ самого ковра, подсвеченный
        rctx.globalAlpha = Math.pow(1 - k / d.len, 1.3) * .35 + .65;
        rctx.fillStyle = k < 2 ? c.head : c.col;
        rctx.fillText(k < 2 ? c.rc : c.ch, x, y);
      }
    }
    rctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const img = new Image();
  img.onload = () => { carpet = img; sampleCarpet(); };
  img.src = window.CARPET;

  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function decrypt(password) {
    const { iter, salt, iv, data } = window.ENC;
    const key0 = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: unb64(salt), iterations: iter, hash: 'SHA-256' },
      key0, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(data));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  let busy = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy || !input.value) return;
    busy = true;
    msg.textContent = '· · ·';
    msg.className = 'show';
    try {
      // дата приводится к «7 мая» (password.js); перебираем варианты порядка день/месяц
      let assets = null;
      for (const p of window.passwordCandidates(input.value)) {
        try { assets = await decrypt(p); break; } catch { /* следующий вариант */ }
      }
      if (!assets) throw new Error('wrong password');
      input.blur();
      msg.textContent = 'открывается';
      lock.classList.add('open');
      window.startScene(assets);
      setTimeout(() => { running = false; lock.remove(); }, 1600);
    } catch {
      msg.textContent = 'не тот ключ';
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      input.select();
      busy = false;
    }
  });
  input.focus();
})();
