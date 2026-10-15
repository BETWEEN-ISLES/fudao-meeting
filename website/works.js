(() => {
  'use strict';
  const categories = window.EXHIBITION_CATEGORIES;
  const works = window.EXHIBITION_WORKS;
  const filters = document.querySelector('#filters');
  const sections = document.querySelector('#work-sections');
  const count = document.querySelector('#result-count');
  const dialog = document.querySelector('#theater');
  const video = document.querySelector('#theater-video');
  const placeholder = document.querySelector('#media-placeholder');
  const mediaError = document.querySelector('#media-error');
  let opener = null, scrollPosition = 0;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  function openTheater(work, trigger) {
    opener = trigger;
    document.querySelector('#theater-title').textContent = work.title;
    document.querySelector('#theater-category').textContent = categoryMap.get(work.category).label;
    document.querySelector('#theater-group').textContent = work.group;
    document.querySelector('#theater-description').textContent = work.description;
    mediaError.hidden = true;
    video.pause(); video.removeAttribute('src'); video.removeAttribute('poster'); video.load();
    video.hidden = !work.trailer;
    placeholder.hidden = Boolean(work.trailer);
    if (work.poster) video.poster = work.poster;
    if (work.trailer) video.src = work.trailer;
    document.querySelector('#media-message').textContent = '預告片準備中';
    scrollPosition = window.scrollY;
    document.body.classList.add('theater-open');
    document.body.style.top = `-${scrollPosition}px`;
    dialog.showModal();
    // The visitor's click starts the selected trailer; controls remain available.
    if (work.trailer) {
      const playback = video.play();
      if (playback) playback.catch(() => {
        mediaError.textContent = '請按影片上的播放鍵開始觀看。';
        mediaError.hidden = false;
      });
    }
  }
  function card(work, index) {
    const article = el('article', `work-card tone-${index % 4}`);
    const poster = el('div', 'poster');
    if (work.poster) {
      const img = el('img'); img.src = work.poster; img.alt = `${work.title}作品海報`; img.loading = 'lazy';
      img.addEventListener('error', () => { img.remove(); poster.append(el('span', 'poster-note', '作品視覺準備中')); });
      poster.append(img);
    } else {
      const art = el('div', 'island-art'); art.setAttribute('aria-hidden', 'true');
      art.append(el('span'), el('span'), el('span'));
      poster.append(art, el('span', 'poster-note', '作品視覺準備中'));
    }
    poster.append(el('span', 'work-number', String(works.indexOf(work) + 1).padStart(2, '0')));
    const body = el('div', 'card-body');
    body.append(el('p', 'card-meta', work.group), el('h3', '', work.title), el('p', 'description', work.description));
    const button = el('button', 'watch', '進入放映室'); button.type = 'button';
    button.setAttribute('aria-label', `進入${work.group}的放映室`);
    button.append(el('span', '', '↗')); button.addEventListener('click', () => openTheater(work, button));
    const bottom = el('div', 'card-bottom'); bottom.append(el('span', 'trailer-state', work.trailer ? '預告片' : '預告片待公布'), button);
    body.append(bottom); article.append(poster, body); return article;
  }
  function render(selected = 'all') {
    sections.replaceChildren();
    const visible = works.filter(w => selected === 'all' || w.category === selected);
    count.textContent = `展出 ${visible.length} / ${works.length} 組`;
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.filter === selected));
    for (const zone of [
      { id: 'cinema', number: '01', name: '影像放映', english: 'MOVING IMAGES', text: '讓故事在光影中展開。動畫、紀實與電影，從這裡開始放映。' },
      { id: 'creation', number: '02', name: '多元創作', english: 'BEYOND THE SCREEN', text: '從觀看走向探索，遇見遊戲、互動與更多創作形式。' }
    ]) {
      const items = visible.filter(w => categoryMap.get(w.category).zone === zone.id);
      if (!items.length) continue;
      const section = el('section', 'zone'); section.setAttribute('aria-labelledby', `zone-${zone.id}`);
      const heading = el('div', 'zone-heading');
      const title = el('h2', '', `${zone.name} `); title.id = `zone-${zone.id}`; title.append(el('span', '', `${items.length} 組`));
      const headingText = el('div'); headingText.append(el('p', 'eyebrow', `${zone.number} / ${zone.english}`), title, el('p', 'zone-description', zone.text));
      heading.append(headingText); section.append(heading);
      const grid = el('div', 'work-grid'); items.forEach((w, i) => grid.append(card(w, i))); section.append(grid); sections.append(section);
    }
  }
  for (const item of [{ id: 'all', label: '全部作品', count: works.length }, ...categories]) {
    const button = el('button', 'filter', `${item.label} ${item.count}`); button.type = 'button'; button.dataset.filter = item.id;
    button.addEventListener('click', () => render(item.id)); filters.append(button);
  }
  document.querySelector('#close-theater').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    video.pause(); video.removeAttribute('src'); video.removeAttribute('poster'); video.load();
    document.body.classList.remove('theater-open'); document.body.style.top = '';
    const html = document.documentElement, previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto'; window.scrollTo(0, scrollPosition); html.style.scrollBehavior = previous;
    if (opener) opener.focus({ preventScroll: true });
  });
  video.addEventListener('error', () => {
    if (!video.getAttribute('src')) return;
    mediaError.textContent = '影片暫時無法播放，請稍後再試。';
    mediaError.hidden = false; video.hidden = true; placeholder.hidden = false;
    document.querySelector('#media-message').textContent = '影片暫時無法播放';
  });
  render();
})();
