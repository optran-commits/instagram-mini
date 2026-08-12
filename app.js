/* ===================== State ===================== */
const KEY = 'insta-mini-v1';
const ME = 'me';

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.users && s.posts && s.stories) return s;
    }
  } catch { /* dữ liệu hỏng -> dùng dữ liệu mẫu */ }
  return {
    users: SEED_USERS,
    posts: SEED_POSTS,
    stories: SEED_STORIES,
    following: ['linh.ng', 'travel_vn', 'minh.chef'],
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    toast('Bộ nhớ trình duyệt đã đầy — không lưu được bài mới');
  }
}

const userOf = (id) => state.users.find((u) => u.id === id) || state.users[0];
const me = () => userOf(ME);
const postOf = (id) => state.posts.find((p) => p.id === id);

/* ===================== Helpers ===================== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'vài giây trước';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

const nf = (n) => n.toLocaleString('vi-VN');

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* Ảnh lỗi -> gradient dự phòng (gắn 1 lần cho toàn trang) */
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG' || img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = fallbackImage(img.dataset.seed || img.alt || img.src);
}, true);

/* ===================== SVG icons ===================== */
const ICON = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5 3.8 12.6a5 5 0 0 1 7.1-7l1.1 1.1 1.1-1.1a5 5 0 0 1 7.1 7z"/></svg>',
  comment: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20.5l1.6-4.6A8.3 8.3 0 0 1 3.5 11 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M21 3 10.5 13.5M21 3l-6.7 18-3.8-7.5L3 9.7z"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
  heartFill: '<svg viewBox="0 0 24 24"><path d="M12 20.5 3.8 12.6a5 5 0 0 1 7.1-7l1.1 1.1 1.1-1.1a5 5 0 0 1 7.1 7z" fill="currentColor"/></svg>',
  commentFill: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20.5l1.6-4.6A8.3 8.3 0 0 1 3.5 11 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" fill="currentColor"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="12" cy="12" r="3.4"/></svg>',
};

/* ===================== Render: Stories ===================== */
function renderStories() {
  return `<div class="stories">${state.stories.map((s, i) => {
    const u = userOf(s.user);
    return `<div class="story" data-story="${i}">
      <div class="ring ${s.seen ? 'seen' : ''}"><img src="${u.avatar}" alt="${esc(u.name)}" data-seed="${esc(u.id)}"></div>
      <span>${s.user === ME ? 'Tin của bạn' : esc(u.name)}</span>
    </div>`;
  }).join('')}</div>`;
}

/* ===================== Render: Post ===================== */
function renderPost(p) {
  const u = userOf(p.user);
  const shown = p.comments.slice(-2);
  const rest = p.comments.length - shown.length;

  return `<article class="post" data-post="${p.id}">
    <div class="post-head">
      <img class="av" src="${u.avatar}" alt="${esc(u.name)}" data-seed="${esc(u.id)}">
      <div class="who">
        <b data-user="${esc(u.id)}">${esc(u.name)}</b>
        ${p.location ? `<small>${esc(p.location)}</small>` : ''}
      </div>
      <button class="more" data-more="${p.id}">···</button>
    </div>

    <div class="img-wrap" data-dbl="${p.id}">
      <img class="post-img" src="${p.image}" alt="Bài viết của ${esc(u.name)}" data-seed="${esc(p.id)}" loading="lazy">
      <div class="burst">${ICON.heartFill}</div>
    </div>

    <div class="post-actions">
      <button class="act ${p.liked ? 'liked' : ''}" data-like="${p.id}" title="Thích">${ICON.heart}</button>
      <button class="act" data-open="${p.id}" title="Bình luận">${ICON.comment}</button>
      <button class="act" data-share="${p.id}" title="Chia sẻ">${ICON.share}</button>
      <span class="spacer"></span>
      <button class="act ${p.saved ? 'saved' : ''}" data-save="${p.id}" title="Lưu">${ICON.bookmark}</button>
    </div>

    <div class="post-body">
      <div class="likes" data-likes="${p.id}">${nf(p.likes)} lượt thích</div>
      ${p.caption ? `<div class="caption"><b data-user="${esc(u.id)}">${esc(u.name)}</b>${esc(p.caption)}</div>` : ''}
      ${rest > 0 ? `<div class="view-comments" data-open="${p.id}">Xem tất cả ${p.comments.length} bình luận</div>` : ''}
      <div data-comments="${p.id}">
        ${shown.map((c) => `<div class="comment-line"><b>${esc(userOf(c.user).name)}</b>${esc(c.text)}</div>`).join('')}
      </div>
      <div class="time-ago">${timeAgo(p.time)}</div>
    </div>

    <form class="add-comment" data-form="${p.id}">
      <input type="text" placeholder="Thêm bình luận..." aria-label="Thêm bình luận">
      <button type="submit">Đăng</button>
    </form>
  </article>`;
}

/* ===================== Render: Sidebar ===================== */
function renderSidebar() {
  const m = me();
  const suggestions = state.users.filter((u) => u.id !== ME).slice(0, 5);
  return `<aside class="sidebar">
    <div class="me">
      <img src="${m.avatar}" alt="${esc(m.name)}" data-seed="me">
      <div><b data-user="me">${esc(m.name)}</b><small>${esc(m.full)}</small></div>
    </div>
    <div class="side-title"><span>Gợi ý cho bạn</span></div>
    ${suggestions.map((u) => {
      const on = state.following.includes(u.id);
      return `<div class="sug">
        <img src="${u.avatar}" alt="${esc(u.name)}" data-seed="${esc(u.id)}">
        <div class="t"><b data-user="${esc(u.id)}">${esc(u.name)}</b><small>${esc(u.full)}</small></div>
        <button class="follow ${on ? 'following' : ''}" data-follow="${esc(u.id)}">${on ? 'Đang theo dõi' : 'Theo dõi'}</button>
      </div>`;
    }).join('')}
    <div class="footnote">Instagram Mini · Dự án demo<br>Dữ liệu được lưu trên máy bạn (localStorage).</div>
  </aside>`;
}

/* ===================== Views ===================== */
const views = {
  home() {
    return `<div class="feed-layout">
      <div>${renderStories()}${state.posts.map(renderPost).join('')}</div>
      ${renderSidebar()}
    </div>`;
  },

  explore() {
    const posts = [...state.posts].sort(() => Math.random() - 0.5);
    return `<div class="grid">${posts.map(tile).join('')}</div>`;
  },

  saved() {
    const posts = state.posts.filter((p) => p.saved);
    if (!posts.length) return emptyState('Chưa có bài viết nào được lưu', ICON.bookmark);
    return `<div class="grid">${posts.map(tile).join('')}</div>`;
  },

  profile(userId = ME) {
    const u = userOf(userId);
    const posts = state.posts.filter((p) => p.user === u.id);
    const isMe = u.id === ME;
    const on = state.following.includes(u.id);
    return `
      <div class="profile-head">
        <img class="pav" src="${u.avatar}" alt="${esc(u.name)}" data-seed="${esc(u.id)}">
        <div class="profile-info">
          <h2>${esc(u.name)}
            ${isMe
              ? `<button class="btn ghost" id="btnNewPost2" style="margin-left:14px">Tạo bài viết</button>`
              : `<button class="btn ${on ? 'ghost' : 'primary'}" data-follow="${esc(u.id)}" style="margin-left:14px">${on ? 'Đang theo dõi' : 'Theo dõi'}</button>`}
          </h2>
          <div class="stats">
            <span><b>${posts.length}</b> bài viết</span>
            <span><b>${nf(1200 + posts.length * 37)}</b> người theo dõi</span>
            <span><b>${nf(state.following.length + 180)}</b> đang theo dõi</span>
          </div>
          <div><b>${esc(u.full)}</b></div>
          <div class="bio">${esc(u.bio)}</div>
        </div>
      </div>
      <div class="tabs"><span class="tab active">Bài viết</span></div>
      ${posts.length ? `<div class="grid">${posts.map(tile).join('')}</div>`
                     : emptyState('Chưa có bài viết nào', ICON.camera)}`;
  },
};

function tile(p) {
  return `<div class="tile" data-open="${p.id}">
    <img src="${p.image}" alt="${esc(p.caption).slice(0, 60)}" data-seed="${esc(p.id)}" loading="lazy">
    <div class="ov">
      <span>${ICON.heartFill}${nf(p.likes)}</span>
      <span>${ICON.commentFill}${p.comments.length}</span>
    </div>
  </div>`;
}

function emptyState(text, icon) {
  return `<div class="empty-state">${icon}<div>${esc(text)}</div></div>`;
}

/* ===================== Router ===================== */
let current = { view: 'home', arg: null };

function go(view, arg = null) {
  current = { view, arg };
  $('#app').innerHTML = views[view](arg);
  $$('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === view));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ===================== Actions ===================== */
function toggleLike(id, force) {
  const p = postOf(id);
  if (!p) return;
  const next = force === undefined ? !p.liked : force;
  if (next === p.liked) return;
  p.liked = next;
  p.likes += next ? 1 : -1;
  save();

  $$(`[data-like="${id}"]`).forEach((b) => b.classList.toggle('liked', p.liked));
  $$(`[data-likes="${id}"]`).forEach((el) => { el.textContent = `${nf(p.likes)} lượt thích`; });
}

function toggleSave(id) {
  const p = postOf(id);
  p.saved = !p.saved;
  save();
  $$(`[data-save="${id}"]`).forEach((b) => b.classList.toggle('saved', p.saved));
  toast(p.saved ? 'Đã lưu bài viết' : 'Đã bỏ lưu');
  if (current.view === 'saved') go('saved');
}

function addComment(id, text) {
  const p = postOf(id);
  p.comments.push({ user: ME, text, time: Date.now() });
  save();

  const box = $(`[data-comments="${id}"]`);
  if (box) {
    box.insertAdjacentHTML('beforeend',
      `<div class="comment-line"><b>${esc(me().name)}</b>${esc(text)}</div>`);
    while (box.children.length > 2) box.removeChild(box.firstElementChild);
  }
  if (!$('#modalPost').classList.contains('hidden')) openPost(id);
}

function toggleFollow(userId) {
  const i = state.following.indexOf(userId);
  if (i >= 0) state.following.splice(i, 1);
  else state.following.push(userId);
  save();
  toast(i >= 0 ? 'Đã bỏ theo dõi' : `Đang theo dõi ${userOf(userId).name}`);
  go(current.view, current.arg);
}

/* ===================== Post detail modal ===================== */
function openPost(id) {
  const p = postOf(id);
  const u = userOf(p.user);

  $('#postDetail').innerHTML = `
    <div class="left"><img src="${p.image}" alt="" data-seed="${esc(p.id)}"></div>
    <div class="right">
      <div class="post-head">
        <img class="av" src="${u.avatar}" alt="" data-seed="${esc(u.id)}">
        <div class="who"><b data-user="${esc(u.id)}">${esc(u.name)}</b>
          ${p.location ? `<small>${esc(p.location)}</small>` : ''}</div>
      </div>
      <div class="comments">
        ${p.caption ? `<div class="cmt">
            <img src="${u.avatar}" alt="" data-seed="${esc(u.id)}">
            <div class="txt"><b>${esc(u.name)}</b> ${esc(p.caption)}<small>${timeAgo(p.time)}</small></div>
          </div>` : ''}
        ${p.comments.map((c) => {
          const cu = userOf(c.user);
          return `<div class="cmt">
            <img src="${cu.avatar}" alt="" data-seed="${esc(cu.id)}">
            <div class="txt"><b>${esc(cu.name)}</b> ${esc(c.text)}<small>${timeAgo(c.time)}</small></div>
          </div>`;
        }).join('') || '<div class="empty-state" style="padding:24px">Chưa có bình luận</div>'}
      </div>
      <div class="post-actions">
        <button class="act ${p.liked ? 'liked' : ''}" data-like="${p.id}">${ICON.heart}</button>
        <button class="act" data-share="${p.id}">${ICON.share}</button>
        <span class="spacer"></span>
        <button class="act ${p.saved ? 'saved' : ''}" data-save="${p.id}">${ICON.bookmark}</button>
      </div>
      <div class="post-body"><div class="likes" data-likes="${p.id}">${nf(p.likes)} lượt thích</div>
        <div class="time-ago">${timeAgo(p.time)}</div></div>
      <form class="add-comment" data-form="${p.id}">
        <input type="text" placeholder="Thêm bình luận..." aria-label="Thêm bình luận">
        <button type="submit">Đăng</button>
      </form>
    </div>`;

  const list = $('#postDetail .comments');
  list.scrollTop = list.scrollHeight;
  openModal('#modalPost');
}

/* ===================== Story viewer ===================== */
let storyTimer;
function openStory(index) {
  const s = state.stories[index];
  if (!s) return;
  const u = userOf(s.user);

  $('#storyAvatar').src = u.avatar;
  $('#storyName').textContent = u.name;
  $('#storyTime').textContent = timeAgo(s.time);
  $('#storyImg').src = s.image;
  $('#storyImg').dataset.seed = s.user + index;

  const bar = $('#storyProgress');
  bar.classList.remove('run');
  void bar.offsetWidth;      // restart animation
  bar.classList.add('run');

  s.seen = true;
  save();

  openModal('#modalStory');
  clearTimeout(storyTimer);
  storyTimer = setTimeout(() => {
    if (index + 1 < state.stories.length) openStory(index + 1);
    else { closeModals(); go(current.view, current.arg); }
  }, 5000);
}

/* ===================== Modals ===================== */
function openModal(sel) {
  $(sel).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModals() {
  $$('.modal').forEach((m) => m.classList.add('hidden'));
  document.body.style.overflow = '';
  clearTimeout(storyTimer);
  if (current.view === 'home' || current.view === 'saved') {
    // giữ nguyên feed; chỉ cập nhật lại vòng story đã xem
    const s = $('.stories');
    if (s) s.outerHTML = renderStories();
  }
}

/* ===================== Tạo bài viết ===================== */
let pendingImage = null;

function resetComposer() {
  pendingImage = null;
  $('#preview').classList.add('hidden');
  $('#preview').removeAttribute('src');
  $('#fileInput').value = '';
  $('#imgUrl').value = '';
  $('#caption').value = '';
  $('#location').value = '';
}

/* Nén ảnh trước khi lưu để không vượt hạn mức localStorage */
function compress(file, max = 1080) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp không phải ảnh hợp lệ'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function pickFile(file) {
  if (!file || !file.type.startsWith('image/')) return toast('Vui lòng chọn một tệp ảnh');
  try {
    pendingImage = await compress(file);
    const pv = $('#preview');
    pv.src = pendingImage;
    pv.classList.remove('hidden');
  } catch (e) {
    toast(e.message);
  }
}

function sharePost() {
  const url = $('#imgUrl').value.trim();
  const image = pendingImage || url;
  if (!image) return toast('Hãy chọn ảnh hoặc dán link ảnh');

  state.posts.unshift({
    id: 'p' + Date.now(),
    user: ME,
    image,
    location: $('#location').value.trim(),
    caption: $('#caption').value.trim(),
    likes: 0, liked: false, saved: false,
    time: Date.now(),
    comments: [],
  });
  save();
  closeModals();
  resetComposer();
  go('home');
  toast('Đã chia sẻ bài viết 🎉');
}

/* ===================== Tìm kiếm ===================== */
function runSearch(q) {
  const box = $('#searchResults');
  const term = q.trim().toLowerCase();
  if (!term) return box.classList.add('hidden');

  const hits = state.users.filter((u) =>
    u.name.toLowerCase().includes(term) || u.full.toLowerCase().includes(term));

  box.innerHTML = hits.length
    ? hits.map((u) => `<div class="row" data-user="${esc(u.id)}">
        <img src="${u.avatar}" alt="" data-seed="${esc(u.id)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">
        <div><b>${esc(u.name)}</b><div style="color:var(--text-dim);font-size:12px">${esc(u.full)}</div></div>
      </div>`).join('')
    : '<div class="empty">Không tìm thấy kết quả</div>';
  box.classList.remove('hidden');
}

/* ===================== Sự kiện toàn cục ===================== */
document.addEventListener('click', (e) => {
  const t = e.target;
  const hit = (attr) => t.closest(`[${attr}]`);

  // đóng modal
  if (t.closest('[data-close]')) return closeModals();
  if (t.classList.contains('modal')) return closeModals();

  // điều hướng
  const nav = hit('data-nav');
  if (nav) {
    e.preventDefault();
    const v = nav.dataset.nav;
    if (v === 'new') { resetComposer(); return openModal('#modalNew'); }
    return go(v);
  }

  // hồ sơ người dùng
  const user = hit('data-user');
  if (user) {
    closeModals();
    $('#searchResults').classList.add('hidden');
    $('#search').value = '';
    return go('profile', user.dataset.user);
  }

  // theo dõi
  const fl = hit('data-follow');
  if (fl) return toggleFollow(fl.dataset.follow);

  // story
  const st = hit('data-story');
  if (st) return openStory(+st.dataset.story);

  // hành động trên bài viết
  const like = hit('data-like');
  if (like) return toggleLike(like.dataset.like);

  const sv = hit('data-save');
  if (sv) return toggleSave(sv.dataset.save);

  const sh = hit('data-share');
  if (sh) {
    const link = `${location.href.split('#')[0]}#post-${sh.dataset.share}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    return toast('Đã sao chép liên kết bài viết');
  }

  const more = hit('data-more');
  if (more) {
    const p = postOf(more.dataset.more);
    if (p.user === ME) {
      if (confirm('Xoá bài viết này?')) {
        state.posts = state.posts.filter((x) => x.id !== p.id);
        save();
        closeModals();
        go(current.view, current.arg);
        toast('Đã xoá bài viết');
      }
    } else {
      toast('Bạn chỉ có thể xoá bài viết của mình');
    }
    return;
  }

  const open = hit('data-open');
  if (open) return openPost(open.dataset.open);

  // click ra ngoài -> đóng gợi ý tìm kiếm
  if (!t.closest('.search-wrap')) $('#searchResults').classList.add('hidden');
});

/* double-click ảnh để thích */
document.addEventListener('dblclick', (e) => {
  const wrap = e.target.closest('[data-dbl]');
  if (!wrap) return;
  toggleLike(wrap.dataset.dbl, true);
  const b = $('.burst', wrap);
  b.classList.remove('go');
  void b.offsetWidth;
  b.classList.add('go');
});

/* form bình luận */
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const input = $('input', form);
  const text = input.value.trim();
  if (!text) return;
  addComment(form.dataset.form, text);
  input.value = '';
  $('button', form).classList.remove('on');
});

/* bật/tắt nút Đăng */
document.addEventListener('input', (e) => {
  const form = e.target.closest('[data-form]');
  if (form) $('button', form).classList.toggle('on', e.target.value.trim().length > 0);
  if (e.target.id === 'search') runSearch(e.target.value);
});

/* phím tắt */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModals();
});

/* ===================== Composer bindings ===================== */
$('#btnNewPost').addEventListener('click', () => { resetComposer(); openModal('#modalNew'); });
document.addEventListener('click', (e) => {
  if (e.target.id === 'btnNewPost2') { resetComposer(); openModal('#modalNew'); }
});
$('#btnShare').addEventListener('click', sharePost);
$('#fileInput').addEventListener('change', (e) => pickFile(e.target.files[0]));

const dz = $('#dropzone');
['dragenter', 'dragover'].forEach((ev) =>
  dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) =>
  dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
dz.addEventListener('drop', (e) => pickFile(e.dataTransfer.files[0]));

$('#imgUrl').addEventListener('input', (e) => {
  const v = e.target.value.trim();
  const pv = $('#preview');
  if (v && !pendingImage) { pv.src = v; pv.classList.remove('hidden'); }
  else if (!v && !pendingImage) pv.classList.add('hidden');
});

/* ===================== Theme ===================== */
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
}
$('#btnTheme').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  save();
  applyTheme();
});

/* ===================== Khởi động ===================== */
applyTheme();
$('#navAvatar').src = me().avatar;
$('#navAvatar').dataset.seed = 'me';
$('#navAvatar2').src = me().avatar;
$('#navAvatar2').dataset.seed = 'me';
go('home');

/* mở thẳng bài viết nếu URL có #post-... */
const m = location.hash.match(/^#post-(.+)$/);
if (m && postOf(m[1])) openPost(m[1]);
