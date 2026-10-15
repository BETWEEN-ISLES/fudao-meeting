(() => {
  'use strict';
  const counter = document.querySelector('#island-count');
  if (!counter) return;
  const text = Array.from(counter.childNodes).find(n => n.nodeType === 3 && n.nodeValue.trim());
  if (!text) return;
  const replay = document.querySelector('#replay-count');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, timer = 0, played = false;
  function play() {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    text.nodeValue = '1';
    let start;
    const tick = now => {
      if (start === undefined) start = now;
      const progress = Math.min((now - start) / 1800, 1);
      text.nodeValue = String(1 + Math.floor(31 * (1 - Math.pow(1 - progress, 1.6))));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    timer = window.setTimeout(() => { frame = window.requestAnimationFrame(tick); }, 350);
  }
  function automaticPlay() {
    if (played || document.hidden) return;
    played = true;
    if (!reduced.matches) play();
  }
  if (replay) replay.addEventListener('click', () => { played = true; play(); });
  function observe() {
    if ('IntersectionObserver' in window) {
      const observer = new window.IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting) && !document.hidden) {
          observer.disconnect(); automaticPlay();
        }
      }, { threshold: .2 });
      observer.observe(counter.parentElement);
    } else automaticPlay();
  }
  if (document.readyState === 'complete') observe();
  else window.addEventListener('load', observe, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (!played) {
      const r = counter.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) automaticPlay();
    }
  });
})();
