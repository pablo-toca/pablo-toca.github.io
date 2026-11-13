// Electrocardiograma animado: onda P, complejo QRS y onda T generados con gaussianas.
(() => {
  const canvas = document.getElementById('ecg');
  const ctx = canvas.getContext('2d');
  const slider = document.getElementById('rate');
  const readout = document.getElementById('bpm');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SPEED = 170;      // píxeles por segundo
  const GAP = 24;         // columnas borradas delante del trazo
  let W, H, dpr, buf, head = 0, phase = 0, bpm = Number(slider.value), last = 0;

  // Forma de un latido; fase entre 0 y 1
  const g = (x, c, a, w) => a * Math.exp(-((x - c) ** 2) / (2 * w * w));
  const beat = p =>
    g(p, 0.16, 0.14, 0.030) +   // P
    g(p, 0.36, -0.14, 0.007) +  // Q
    g(p, 0.39, 1.00, 0.009) +   // R
    g(p, 0.42, -0.28, 0.010) +  // S
    g(p, 0.66, 0.26, 0.050);    // T

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buf = new Float32Array(W).fill(NaN);
    head = 0;
    if (reduced) fillStatic();
    draw();
  }

  function sample(i) {
    phase = (phase + 1 / SPEED / (60 / bpm)) % 1;
    buf[i] = beat(phase);
  }

  function fillStatic() {
    for (let i = 0; i < W; i++) sample(i);
  }

  function yOf(v) { return H * 0.72 - v * H * 0.55; }

  function draw() {
    const style = getComputedStyle(document.documentElement);
    const trace = style.getPropertyValue('--trace').trim();
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = trace;
    ctx.beginPath();
    let pen = false;
    for (let x = 0; x < W; x++) {
      if (Number.isNaN(buf[x])) { pen = false; continue; }
      const y = yOf(buf[x]);
      if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      pen = true;
    }
    ctx.stroke();
    if (!reduced) {
      const hx = Math.floor(head) % W;
      if (!Number.isNaN(buf[hx])) {
        ctx.fillStyle = trace;
        ctx.beginPath();
        ctx.arc(hx, yOf(buf[hx]), 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function frame(t) {
    const dt = Math.min((t - last) / 1000 || 0, 0.05);
    last = t;
    const next = head + SPEED * dt;
    for (let i = Math.floor(head); i < Math.floor(next); i++) {
      sample(i % W);
      for (let k = 1; k <= GAP; k++) buf[(i + k) % W] = NaN;
    }
    head = next % W;
    draw();
    requestAnimationFrame(frame);
  }

  slider.addEventListener('input', () => {
    bpm = Number(slider.value);
    readout.textContent = bpm;
    if (reduced) { phase = 0; fillStatic(); draw(); }
  });

  window.addEventListener('resize', resize);
  resize();
  if (!reduced) requestAnimationFrame(frame);
})();