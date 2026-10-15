(() => {
  'use strict';
  const counter = document.querySelector('#island-count');
  if (!counter) return;
  const text = Array.from(counter.childNodes).find(n => n.nodeType === 3 && n.nodeValue.trim());
  if (!text) return;
  let frame = 0, played = false;
  function play() {
    window.cancelAnimationFrame(frame);
    played = true;
    text.nodeValue = '1';
    let start;
    function tick(now) {
      if (start === undefined) start = now;
      const progress = Math.min((now - start) / 1800, 1);
      text.nodeValue = String(1 + Math.floor(31 * (1 - Math.pow(1 - progress, 1.6))));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);
  }
  const replay = document.querySelector('#replay-count');
  if (replay) replay.addEventListener('click', play);
  // Deferred script starts as soon as the page DOM is ready, without waiting
  // for fonts, images, scrolling, or the full window load event.
  // Only text changes; no movement or flashing is introduced.
  if (!document.hidden) play();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !played) play();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && !document.hidden) play();
  });
})();
