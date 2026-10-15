(() => {
  const entry = document.querySelector('.enter');
  const dialog = document.querySelector('#entry-choice');
  if (!entry || !dialog) return;
  entry.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); dialog.showModal();
  });
  document.querySelector('#dismiss-choice').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => entry.focus({ preventScroll: true }));
})();
