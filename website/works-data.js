// Fill in each group's real title, description, poster and trailer here.
// Use local relative paths, e.g. media/2d-01-poster.jpg and media/2d-01-trailer.mp4.
// No sample film is used in place of a group's actual work.
window.EXHIBITION_CATEGORIES = [
  { id: '2d', label: '2D 動畫', count: 14, zone: 'cinema' },
  { id: '3d', label: '3D 動畫', count: 2, zone: 'cinema' },
  { id: 'documentary', label: '紀錄片', count: 1, zone: 'cinema' },
  { id: 'film', label: '自媒體電影製作', count: 1, zone: 'cinema' },
  { id: 'game', label: '遊戲設計', count: 4, zone: 'creation' },
  { id: 'idol', label: '虛擬偶像', count: 1, zone: 'creation' },
  { id: 'novel', label: '視覺小說', count: 1, zone: 'creation' },
  { id: 'interaction', label: '互動設計', count: 3, zone: 'creation' },
  { id: 'thesis', label: '論文', count: 1, zone: 'creation' },
  { id: 'book', label: '電子繪本', count: 4, zone: 'creation' }
];
window.EXHIBITION_WORKS = window.EXHIBITION_CATEGORIES.flatMap(category =>
  Array.from({ length: category.count }, (_, index) => ({
    id: `${category.id}-${String(index + 1).padStart(2, '0')}`,
    category: category.id,
    group: `${category.label} 第 ${String(index + 1).padStart(2, '0')} 組`,
    title: '作品名稱待公布',
    description: '本組作品介紹將於資料確認後公開。',
    poster: '',
    trailer: ''
  }))
);
// Replace individual fields by stable group ID when the material is ready:
// Object.assign(window.EXHIBITION_WORKS.find(work => work.id === '2d-01'), {
//   title: '真實作品名稱', description: '真實作品介紹',
//   poster: 'media/2d-01-poster.jpg', trailer: 'media/2d-01-trailer.mp4'
// });
