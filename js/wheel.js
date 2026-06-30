// ===== WHEEL.JS — Drag-spin wheel with analogue clock center =====

(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 160, CY = 160, R = 48;
  const tg = document.getElementById('clockTicks');

  if (!tg) return; // wheel not present on this page

  const nums = ['१२','१','२','३','४','५','६','७','८','९','१०','११'];

  for (let i = 0; i < 60; i++) {
    const rad = i * 6 * Math.PI / 180;
    const isHour = i % 5 === 0;
    const r1 = isHour ? R - 7 : R - 4;
    const r2 = R - 1;
    const sw = isHour ? 1.4 : 0.6;
    const op = isHour ? 0.7 : 0.35;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', CX + r1 * Math.sin(rad));
    line.setAttribute('y1', CY - r1 * Math.cos(rad));
    line.setAttribute('x2', CX + r2 * Math.sin(rad));
    line.setAttribute('y2', CY - r2 * Math.cos(rad));
    line.setAttribute('stroke', '#1a3a6b');
    line.setAttribute('stroke-width', sw);
    line.setAttribute('opacity', op);
    line.setAttribute('stroke-linecap', 'round');
    tg.appendChild(line);
  }
  for (let i = 0; i < 12; i++) {
    const rad = i * 30 * Math.PI / 180;
    const isQ = i % 3 === 0;
    const nr = isQ ? R - 14 : R - 13;
    const txt = document.createElementNS(NS, 'text');
    txt.setAttribute('x', CX + nr * Math.sin(rad));
    txt.setAttribute('y', CY - nr * Math.cos(rad));
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('dominant-baseline', 'central');
    txt.setAttribute('font-size', isQ ? '7' : '6');
    txt.setAttribute('font-weight', isQ ? '700' : '600');
    txt.setAttribute('fill', '#1a3a6b');
    txt.setAttribute('opacity', isQ ? '0.75' : '0.5');
    txt.setAttribute('font-family', 'Noto Sans Devanagari, sans-serif');
    txt.textContent = nums[i];
    tg.appendChild(txt);
  }

  function rot(id, deg) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('transform', `rotate(${deg},${CX},${CY})`);
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    const now = new Date();
    const h24 = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    const h12 = h24 % 12 || 12;
    rot('wHourHand',   (h24 % 12) * 30 + m * 0.5);
    rot('wMinuteHand', m * 6 + s * 0.1);
    rot('wSecondHand', s * 6);
    const el = document.getElementById('wheelDigitalTime');
    const NP = n => String(n).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
    const ampmNP = h24 < 12 ? 'बिहान' : h24 < 17 ? 'दिउँसो' : 'बेलुकी';
    if (el) el.textContent = NP(pad(h12)) + ':' + NP(pad(m)) + ':' + NP(pad(s)) + ' ' + ampmNP;
  }

  tick();
  setInterval(tick, 1000);
})();

// ===== Drag-spin wheel physics =====
(function () {
  const wrap  = document.getElementById('wheelWrap');
  const group = document.getElementById('wheelGroup');
  if (!wrap || !group) return;

  const CX = 160, CY = 160;
  const AUTO_SPEED = 1.20;
  const FRICTION   = 0.97;
  const MIN_VEL    = 0.05;

  let angle    = 0;
  let velocity = AUTO_SPEED;
  let dragging = false;
  let prevMouseAngle = 0;
  let lastTime = 0;

  function clientToAngle(e) {
    const rect = wrap.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const svgX = ((cx - rect.left) / rect.width)  * 330 - 5;
    const svgY = ((cy - rect.top)  / rect.height) * 330 - 5;
    return Math.atan2(svgY - CY, svgX - CX) * (180 / Math.PI);
  }

  function applyRotation() {
    group.setAttribute('transform', `rotate(${angle},${CX},${CY})`);
  }

  function loop() {
    if (!dragging) {
      if (Math.abs(velocity) < MIN_VEL) {
        velocity += (AUTO_SPEED - velocity) * 0.05;
      } else {
        velocity *= FRICTION;
        if (Math.abs(velocity) < AUTO_SPEED * 2) {
          velocity += (AUTO_SPEED - velocity) * 0.02;
        }
      }
      angle += velocity;
      applyRotation();
    }
    requestAnimationFrame(loop);
  }

  function onStart(e) {
    e.preventDefault();
    dragging = true;
    velocity = 0;
    prevMouseAngle = clientToAngle(e);
    lastTime = performance.now();
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const now = performance.now();
    const dt  = Math.max(now - lastTime, 1);
    const cur = clientToAngle(e);
    let delta = cur - prevMouseAngle;
    if (delta >  180) delta -= 360;
    if (delta < -180) delta += 360;

    velocity = delta / dt * 16;
    angle   += delta;
    applyRotation();
    prevMouseAngle = cur;
    lastTime = now;
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    velocity = Math.max(-8, Math.min(8, velocity));
  }

  wrap.addEventListener('mousedown',  onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup',   onEnd);
  wrap.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend',  onEnd);

  requestAnimationFrame(loop);
})();
