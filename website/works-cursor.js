(() => {
  'use strict';
  if (!document.body.classList.contains('works-page')) return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const overlay = document.createElement('div');
  overlay.className = 'works-crosshair';
  overlay.setAttribute('aria-hidden', 'true');
  const horizontal = document.createElement('span');
  horizontal.className = 'crosshair-horizontal';
  const vertical = document.createElement('span');
  vertical.className = 'crosshair-vertical';
  overlay.append(horizontal, vertical);
  document.body.append(overlay);
  let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, last = 0, visible = false;
  function paint() {
    horizontal.style.transform = `translateY(${y.toFixed(2)}px)`;
    vertical.style.transform = `translateX(${x.toFixed(2)}px)`;
  }
  function hide() {
    visible = false;
    overlay.classList.remove('is-visible');
    window.cancelAnimationFrame(frame); frame = 0; last = 0;
  }
  function tick(now) {
    frame = 0;
    if (!visible || document.body.classList.contains('theater-open')) { hide(); return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
    last = now;
    const follow = reduced.matches ? 1 : 1 - Math.exp(-dt * 7);
    x += (targetX - x) * follow; y += (targetY - y) * follow;
    if (Math.abs(targetX - x) + Math.abs(targetY - y) < .15) {
      x = targetX; y = targetY; paint(); last = 0; return;
    }
    paint(); frame = window.requestAnimationFrame(tick);
  }
  window.addEventListener('pointermove', event => {
    if (!fine.matches || event.pointerType !== 'mouse' || document.body.classList.contains('theater-open')) { hide(); return; }
    targetX = event.clientX; targetY = event.clientY;
    if (!visible) {
      x = targetX; y = targetY; paint(); visible = true;
      overlay.classList.add('is-visible');
    }
    if (!frame) frame = window.requestAnimationFrame(tick);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  window.addEventListener('resize', hide);
  window.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  fine.addEventListener('change', hide);
})();

