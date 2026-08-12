/* ===================== Trạng thái phiên ===================== */
let ME = null;          // hồ sơ người đang đăng nhập (null = khách)
let FOLLOWING = [];     // id những người tôi đang theo dõi
let current = { view: 'home', arg: null };

/* ===================== Tiện ích ===================== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'vài giây trước';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

const nf = (n) => Number(n || 0).toLocaleString('vi-VN');

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* Ảnh hỏng -> gradient dự phòng */
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG' || img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = fallbackImage(img.dataset.seed || img.alt || img.src);
}, true);

/* Ảnh đại diện mặc định khi hồ sơ chưa có avatar */
const avatarOf = (p) => (p && p.avatar_url) ? p.avatar_url : fallbackImage(p ? p.username : '?');

/* Yêu cầu đăng nhập cho các hành động cần quyền ghi */
function requireLogin(msg = 'Bạn cần đăng nhập để làm điều này') {
  if (ME) return true;
  toast(msg);
  openModal('#modalAuth');
  return false;
}

/* ===================== Icon ===================== */
const ICON = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5 3.8 12.6a5 5 0 0 1 7.1-7l1.1 1.1 1.1-1.1a5 5 0 0 1 7.1 7z"/></svg>',
  comment: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20.5l1.6-4.6A8.3 8.3 0 0 1 3.5 11 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M21 3 10.5 13.5M21 3l-6.7 18-3.8-7.5L3 9.7z"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
  heartFill: '<svg viewBox="0 0 24 24"><path d="M12 20.5 3.8 12.6a5 5 0 0 1 7.1-7l1.1 1.1 1.1-1.1a5 5 0 0 1 7.1 7z" fill="currentColor"/></svg>',
  commentFill: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20.5l1.6-4.6A8.3 8.3 0 0 1 3.5 11 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" fill="currentColor"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="12" cy="12" r="3.4"/></svg>',
};

const spinner = (label = 'Đang tải...') =>
  `<div class="empty-state"><div class="spin"></div><div>${esc(label)}</div></div>`;

/* ===================== Render ===================== */

/* Tin: lấy từ những người đăng gần đây nhất (dữ liệu thật, không bịa) */
function renderStories(posts) {
  const seen = new Set();
  const list = [];
  for (const p of posts) {
    if (seen.has(p.user_id)) continue;
    seen.add(p.user_id);
    list.push(p);
    if (list.length >= 12) break;
  }
  if (!list.length) return '';
  return `<div class="stories">${list.map((p) => `
    <div class="story" data-story="${esc(p.id)}">
      <div class="ring"><img src="${esc(avatarOf(p))}" alt="${esc(p.username)}" data-seed="${esc(p.username)}"></div>
      <span>${p.user_id === (ME && ME.id) ? 'Tin của bạn' : esc(p.username)}</span>
    </div>`).join('')}</div>`;
}

function renderPost(p) {
  return `<article class="post" data-post="${esc(p.id)}">
    <div class="post-head">
      <img class="av" src="${esc(avatarOf(p))}" alt="${esc(p.username)}" data-seed="${esc(p.username)}">
      <div class="who">
        <b data-user="${esc(p.user_id)}">${esc(p.username)}</b>
        ${p.location ? `<small>${esc(p.location)}</small>` : ''}
      </div>
      ${ME && ME.id === p.user_id ? `<button class="more" data-del="${esc(p.id)}" title="Xoá bài viết">···</button>` : ''}
    </div>

    <div class="img-wrap" data-dbl="${esc(p.id)}">
      <img class="post-img" src="${esc(p.image_url)}" alt="Bài viết của ${esc(p.username)}" data-seed="${esc(p.id)}" loading="lazy">
      <div class="burst">${ICON.heartFill}</div>
    </div>

    <div class="post-actions">
      <button class="act ${p.liked ? 'liked' : ''}" data-like="${esc(p.id)}" title="Thích">${ICON.heart}</button>
      <button class="act" data-open="${esc(p.id)}" title="Bình luận">${ICON.comment}</button>
      <button class="act" data-share="${esc(p.id)}" title="Chia sẻ">${ICON.share}</button>
      <span class="spacer"></span>
      <button class="act ${p.saved ? 'saved' : ''}" data-save="${esc(p.id)}" title="Lưu">${ICON.bookmark}</button>
    </div>

    <div class="post-body">
      <div class="likes" data-likes="${esc(p.id)}">${nf(p.like_count)} lượt thích</div>
      ${p.caption ? `<div class="caption"><b data-user="${esc(p.user_id)}">${esc(p.username)}</b>${esc(p.caption)}</div>` : ''}
      ${p.comment_count > 0 ? `<div class="view-comments" data-open="${esc(p.id)}">Xem tất cả ${nf(p.comment_count)} bình luận</div>` : ''}
      <div class="time-ago">${timeAgo(p.created_at)}</div>
    </div>

    <form class="add-comment" data-form="${esc(p.id)}">
      <input type="text" placeholder="Thêm bình luận..." aria-label="Thêm bình luận" maxlength="1000">
      <button type="submit">Đăng</button>
    </form>
  </article>`;
}

function tile(p) {
  return `<div class="tile" data-open="${esc(p.id)}">
    <img src="${esc(p.image_url)}" alt="${esc((p.caption || '').slice(0, 60))}" data-seed="${esc(p.id)}" loading="lazy">
    <div class="ov">
      <span>${ICON.heartFill}${nf(p.like_count)}</span>
      <span>${ICON.commentFill}${nf(p.comment_count)}</span>
    </div>
  </div>`;
}

function emptyState(text, icon, sub = '') {
  return `<div class="empty-state">${icon}<div>${esc(text)}</div>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
}

async function renderSidebar() {
  const people = await DB.suggestions(ME && ME.id, 5);
  return `<aside class="sidebar">
    ${ME ? `<div class="me">
      <img src="${esc(avatarOf(ME))}" alt="" data-seed="${esc(ME.username)}">
      <div><b data-user="${esc(ME.id)}">${esc(ME.username)}</b><small>${esc(ME.full_name || '')}</small></div>
      <button class="follow" id="btnLogout" style="margin-left:auto">Đăng xuất</button>
    </div>` : `<div class="me">
      <div><b>Bạn đang xem với tư cách khách</b>
      <small>Đăng nhập để đăng bài, thích và bình luận.</small></div>
      <button class="btn primary" data-auth-open style="margin-left:auto">Đăng nhập</button>
    </div>`}
    <div class="side-title"><span>Gợi ý cho bạn</span></div>
    ${people.length ? people.map((u) => {
      const on = FOLLOWING.includes(u.id);
      return `<div class="sug">
        <img src="${esc(avatarOf(u))}" alt="" data-seed="${esc(u.username)}">
        <div class="t"><b data-user="${esc(u.id)}">${esc(u.username)}</b><small>${esc(u.full_name || '')}</small></div>
        <button class="follow ${on ? 'following' : ''}" data-follow="${esc(u.id)}">${on ? 'Đang theo dõi' : 'Theo dõi'}</button>
      </div>`;
    }).join('') : '<small style="color:var(--text-dim)">Chưa có người dùng nào khác.</small>'}
    <div class="footnote">Instagram Mini · Dữ liệu lưu trên Supabase (Postgres).<br>Bài viết được chia sẻ giữa tất cả người dùng.</div>
  </aside>`;
}

/* ===================== Các trang ===================== */
const views = {
  async home() {
    const posts = await DB.feed();
    const body = posts.length
      ? renderStories(posts) + posts.map(renderPost).join('')
      : renderStories(posts) + emptyState(
          'Chưa có bài viết nào',
          ICON.camera,
          ME ? 'Hãy là người đăng bài đầu tiên!' : 'Đăng nhập và đăng bài đầu tiên nhé.');
    return `<div class="feed-layout"><div>${body}</div>${await renderSidebar()}</div>`;
  },

  async explore() {
    const posts = await DB.feed(60);
    if (!posts.length) return emptyState('Chưa có gì để khám phá', ICON.camera);
    return `<div class="grid">${posts.map(tile).join('')}</div>`;
  },

  async saved() {
    if (!ME) return emptyState('Đăng nhập để xem mục đã lưu', ICON.bookmark);
    const posts = await DB.savedPosts();
    if (!posts.length) return emptyState('Chưa có bài viết nào được lưu', ICON.bookmark);
    return `<div class="grid">${posts.map(tile).join('')}</div>`;
  },

  async profile(userId) {
    const id = userId || (ME && ME.id);
    if (!id) return emptyState('Đăng nhập để xem trang cá nhân', ICON.camera);

    const [u, posts, stats] = await Promise.all([
      DB.profileById(id), DB.postsByUser(id), DB.profileStats(id),
    ]);
    if (!u) return emptyState('Không tìm thấy người dùng này', ICON.camera);

    const isMe = ME && ME.id === u.id;
    const on = FOLLOWING.includes(u.id);
    return `
      <div class="profile-head">
        <img class="pav" src="${esc(avatarOf(u))}" alt="${esc(u.username)}" data-seed="${esc(u.username)}">
        <div class="profile-info">
          <h2>${esc(u.username)}
            ${isMe
              ? `<button class="btn ghost" data-new-post style="margin-left:14px">Tạo bài viết</button>
                 <button class="btn ghost" id="btnLogout" style="margin-left:8px">Đăng xuất</button>`
              : `<button class="btn ${on ? 'ghost' : 'primary'}" data-follow="${esc(u.id)}" style="margin-left:14px">${on ? 'Đang theo dõi' : 'Theo dõi'}</button>`}
          </h2>
          <div class="stats">
            <span><b>${nf(stats.posts)}</b> bài viết</span>
            <span><b>${nf(stats.followers)}</b> người theo dõi</span>
            <span><b>${nf(stats.following)}</b> đang theo dõi</span>
          </div>
          <div><b>${esc(u.full_name || '')}</b></div>
          <div class="bio">${esc(u.bio || '')}</div>
        </div>
      </div>
      <div class="tabs"><span class="tab active">Bài viết</span></div>
      ${posts.length ? `<div class="grid">${posts.map(tile).join('')}</div>`
                     : emptyState('Chưa có bài viết nào', ICON.camera)}`;
  },
};

/* ===================== Điều hướng ===================== */
async function go(view, arg = null) {
  current = { view, arg };
  const app = $('#app');
  app.innerHTML = spinner();
  $$('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === view));
  try {
    app.innerHTML = await views[view](arg);
  } catch (e) {
    app.innerHTML = emptyState('Không tải được dữ liệu', ICON.camera, e.message);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

const refresh = () => go(current.view, current.arg);

/* ===================== Hành động ===================== */
async function toggleLike(id, force) {
  if (!requireLogin('Bạn cần đăng nhập để thích bài viết')) return;

  const btn = $(`[data-like="${id}"]`);
  const wasLiked = btn.classList.contains('liked');
  const next = force === undefined ? !wasLiked : force;
  if (next === wasLiked) return;

  // cập nhật lạc quan, hoàn tác nếu máy chủ từ chối
  const labels = $$(`[data-likes="${id}"]`);
  const before = labels.map((el) => el.textContent);
  const n = Number((before[0] || '0').replace(/\D/g, '')) + (next ? 1 : -1);
  $$(`[data-like="${id}"]`).forEach((b) => b.classList.toggle('liked', next));
  labels.forEach((el) => { el.textContent = `${nf(n)} lượt thích`; });

  try {
    await DB.setLike(id, next);
  } catch (e) {
    $$(`[data-like="${id}"]`).forEach((b) => b.classList.toggle('liked', wasLiked));
    labels.forEach((el, i) => { el.textContent = before[i]; });
    toast(e.message);
  }
}

async function toggleSave(id) {
  if (!requireLogin('Bạn cần đăng nhập để lưu bài viết')) return;
  const btn = $(`[data-save="${id}"]`);
  const next = !btn.classList.contains('saved');
  $$(`[data-save="${id}"]`).forEach((b) => b.classList.toggle('saved', next));
  try {
    await DB.setSave(id, next);
    toast(next ? 'Đã lưu bài viết' : 'Đã bỏ lưu');
    if (current.view === 'saved') refresh();
  } catch (e) {
    $$(`[data-save="${id}"]`).forEach((b) => b.classList.toggle('saved', !next));
    toast(e.message);
  }
}

async function toggleFollow(userId) {
  if (!requireLogin()) return;
  const on = !FOLLOWING.includes(userId);
  try {
    await DB.setFollow(userId, on);
    FOLLOWING = await DB.following();
    toast(on ? 'Đã theo dõi' : 'Đã bỏ theo dõi');
    refresh();
  } catch (e) { toast(e.message); }
}

async function submitComment(postId, text) {
  if (!requireLogin('Bạn cần đăng nhập để bình luận')) return false;
  try {
    await DB.addComment(postId, text);
    if (!$('#modalPost').classList.contains('hidden')) await openPost(postId);
    else refresh();
    return true;
  } catch (e) { toast(e.message); return false; }
}

async function removePost(id) {
  if (!confirm('Xoá bài viết này?')) return;
  try {
    await DB.deletePost(id);
    closeModals();
    toast('Đã xoá bài viết');
    refresh();
  } catch (e) { toast(e.message); }
}

/* ===================== Chi tiết bài viết ===================== */
async function openPost(id) {
  openModal('#modalPost');
  $('#postDetail').innerHTML = spinner();

  let p, cmts;
  try {
    [p, cmts] = await Promise.all([DB.post(id), DB.comments(id)]);
  } catch (e) { $('#postDetail').innerHTML = emptyState('Không tải được', ICON.camera, e.message); return; }
  if (!p) { $('#postDetail').innerHTML = emptyState('Bài viết không tồn tại', ICON.camera); return; }

  $('#postDetail').innerHTML = `
    <div class="left"><img src="${esc(p.image_url)}" alt="" data-seed="${esc(p.id)}"></div>
    <div class="right">
      <div class="post-head">
        <img class="av" src="${esc(avatarOf(p))}" alt="" data-seed="${esc(p.username)}">
        <div class="who"><b data-user="${esc(p.user_id)}">${esc(p.username)}</b>
          ${p.location ? `<small>${esc(p.location)}</small>` : ''}</div>
        ${ME && ME.id === p.user_id ? `<button class="more" data-del="${esc(p.id)}">···</button>` : ''}
      </div>
      <div class="comments">
        ${p.caption ? `<div class="cmt">
            <img src="${esc(avatarOf(p))}" alt="" data-seed="${esc(p.username)}">
            <div class="txt"><b>${esc(p.username)}</b> ${esc(p.caption)}<small>${timeAgo(p.created_at)}</small></div>
          </div>` : ''}
        ${cmts.length ? cmts.map((c) => {
          const cu = c.profiles || {};
          return `<div class="cmt">
            <img src="${esc(avatarOf(cu))}" alt="" data-seed="${esc(cu.username || '?')}">
            <div class="txt"><b>${esc(cu.username || 'người dùng')}</b> ${esc(c.body)}
              <small>${timeAgo(c.created_at)}${ME && ME.id === c.user_id
                ? ` · <a href="#" data-delcmt="${esc(c.id)}" style="color:var(--danger)">xoá</a>` : ''}</small></div>
          </div>`;
        }).join('') : '<div class="empty-state" style="padding:24px">Chưa có bình luận</div>'}
      </div>
      <div class="post-actions">
        <button class="act ${p.liked ? 'liked' : ''}" data-like="${esc(p.id)}">${ICON.heart}</button>
        <button class="act" data-share="${esc(p.id)}">${ICON.share}</button>
        <span class="spacer"></span>
        <button class="act ${p.saved ? 'saved' : ''}" data-save="${esc(p.id)}">${ICON.bookmark}</button>
      </div>
      <div class="post-body">
        <div class="likes" data-likes="${esc(p.id)}">${nf(p.like_count)} lượt thích</div>
        <div class="time-ago">${timeAgo(p.created_at)}</div>
      </div>
      <form class="add-comment" data-form="${esc(p.id)}">
        <input type="text" placeholder="Thêm bình luận..." aria-label="Thêm bình luận" maxlength="1000">
        <button type="submit">Đăng</button>
      </form>
    </div>`;

  const list = $('#postDetail .comments');
  list.scrollTop = list.scrollHeight;
}

/* ===================== Tin ===================== */
let storyTimer;
async function openStory(postId) {
  const p = await DB.post(postId);
  if (!p) return;
  $('#storyAvatar').src = avatarOf(p);
  $('#storyName').textContent = p.username;
  $('#storyTime').textContent = timeAgo(p.created_at);
  $('#storyImg').src = p.image_url;
  $('#storyImg').dataset.seed = p.id;

  const bar = $('#storyProgress');
  bar.classList.remove('run');
  void bar.offsetWidth;
  bar.classList.add('run');

  openModal('#modalStory');
  clearTimeout(storyTimer);
  storyTimer = setTimeout(closeModals, 5000);
}

/* ===================== Modal ===================== */
function openModal(sel) {
  $$('.modal').forEach((m) => m.classList.add('hidden'));
  $(sel).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModals() {
  $$('.modal').forEach((m) => m.classList.add('hidden'));
  document.body.style.overflow = '';
  clearTimeout(storyTimer);
}

/* ===================== Soạn bài viết ===================== */
let pendingBlob = null;

function resetComposer() {
  pendingBlob = null;
  $('#preview').classList.add('hidden');
  $('#preview').removeAttribute('src');
  $('#fileInput').value = '';
  $('#imgUrl').value = '';
  $('#caption').value = '';
  $('#location').value = '';
  $('#btnShare').disabled = false;
  $('#btnShare').textContent = 'Chia sẻ';
}

/* Nén ảnh trước khi tải lên để tiết kiệm băng thông và dung lượng */
function compress(file, max = 1440) {
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
        c.toBlob((b) => b ? resolve(b) : reject(new Error('Không nén được ảnh')), 'image/jpeg', 0.85);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function pickFile(file) {
  if (!file || !file.type.startsWith('image/')) return toast('Vui lòng chọn một tệp ảnh');
  try {
    pendingBlob = await compress(file);
    const pv = $('#preview');
    pv.src = URL.createObjectURL(pendingBlob);
    pv.classList.remove('hidden');
  } catch (e) { toast(e.message); }
}

async function sharePost() {
  if (!requireLogin('Bạn cần đăng nhập để đăng bài')) return;

  const url = $('#imgUrl').value.trim();
  if (!pendingBlob && !url) return toast('Hãy chọn ảnh hoặc dán link ảnh');

  const btn = $('#btnShare');
  btn.disabled = true;
  btn.textContent = 'Đang đăng...';
  try {
    const imageUrl = pendingBlob ? await DB.uploadImage(pendingBlob) : url;
    await DB.createPost({
      imageUrl,
      caption: $('#caption').value.trim(),
      location: $('#location').value.trim(),
    });
    closeModals();
    resetComposer();
    await go('home');
    toast('Đã chia sẻ bài viết 🎉');
  } catch (e) {
    toast(e.message);
    btn.disabled = false;
    btn.textContent = 'Chia sẻ';
  }
}

/* ===================== Đăng nhập / Đăng ký ===================== */
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  $('#authTitle').textContent = mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản';
  $('#authSubmit').textContent = mode === 'login' ? 'Đăng nhập' : 'Đăng ký';
  $('#authUsername').classList.toggle('hidden', mode === 'login');
  $('#authSwitch').innerHTML = mode === 'login'
    ? 'Chưa có tài khoản? <a href="#" data-auth-mode="signup">Đăng ký</a>'
    : 'Đã có tài khoản? <a href="#" data-auth-mode="login">Đăng nhập</a>';
  $('#authError').textContent = '';
}

async function submitAuth(e) {
  e.preventDefault();
  const email = $('#authEmail').value.trim();
  const pass = $('#authPassword').value;
  const username = $('#authUsername').value.trim();
  const err = $('#authError');
  const btn = $('#authSubmit');
  err.textContent = '';

  if (!email || !pass) { err.textContent = 'Vui lòng nhập email và mật khẩu'; return; }
  if (authMode === 'signup') {
    if (username.length < 3) { err.textContent = 'Tên người dùng cần ít nhất 3 ký tự'; return; }
    if (!/^[a-z0-9._]+$/i.test(username)) { err.textContent = 'Tên người dùng chỉ gồm chữ, số, dấu chấm và gạch dưới'; return; }
    if (pass.length < 6) { err.textContent = 'Mật khẩu cần ít nhất 6 ký tự'; return; }
  }

  btn.disabled = true;
  btn.textContent = 'Đang xử lý...';
  try {
    if (authMode === 'login') {
      await DB.signIn(email, pass);
      closeModals();
      toast('Đăng nhập thành công');
    } else {
      const { needsEmailConfirm } = await DB.signUp(email, pass, username);
      if (needsEmailConfirm) {
        err.style.color = 'var(--text)';
        err.textContent = 'Đã gửi email xác minh. Hãy mở email và bấm liên kết, rồi quay lại đăng nhập.';
        setAuthMode('login');
        return;
      }
      closeModals();
      toast('Chào mừng bạn! 🎉');
    }
  } catch (ex) {
    err.style.color = 'var(--danger)';
    err.textContent = ex.message;
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Đăng nhập' : 'Đăng ký';
  }
}

/* ===================== Tìm kiếm ===================== */
let searchTimer;
function runSearch(q) {
  clearTimeout(searchTimer);
  const box = $('#searchResults');
  if (!q.trim()) return box.classList.add('hidden');
  searchTimer = setTimeout(async () => {
    let hits = [];
    try { hits = await DB.searchProfiles(q); } catch { /* bỏ qua */ }
    box.innerHTML = hits.length
      ? hits.map((u) => `<div class="row" data-user="${esc(u.id)}">
          <img src="${esc(avatarOf(u))}" alt="" data-seed="${esc(u.username)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">
          <div><b>${esc(u.username)}</b><div style="color:var(--text-dim);font-size:12px">${esc(u.full_name || '')}</div></div>
        </div>`).join('')
      : '<div class="empty">Không tìm thấy kết quả</div>';
    box.classList.remove('hidden');
  }, 250);
}

/* ===================== Sự kiện ===================== */
document.addEventListener('click', async (e) => {
  const t = e.target;
  const hit = (a) => t.closest(`[${a}]`);

  if (t.closest('[data-close]')) return closeModals();
  if (t.classList.contains('modal')) return closeModals();

  const mode = hit('data-auth-mode');
  if (mode) { e.preventDefault(); return setAuthMode(mode.dataset.authMode); }

  if (hit('data-auth-open')) { setAuthMode('login'); return openModal('#modalAuth'); }

  if (t.id === 'btnLogout') {
    await DB.signOut();
    toast('Đã đăng xuất');
    return;
  }

  if (hit('data-new-post')) {
    if (!requireLogin('Bạn cần đăng nhập để đăng bài')) return;
    resetComposer();
    return openModal('#modalNew');
  }

  const nav = hit('data-nav');
  if (nav) {
    e.preventDefault();
    const v = nav.dataset.nav;
    if (v === 'new') {
      if (!requireLogin('Bạn cần đăng nhập để đăng bài')) return;
      resetComposer();
      return openModal('#modalNew');
    }
    return go(v);
  }

  const user = hit('data-user');
  if (user) {
    closeModals();
    $('#searchResults').classList.add('hidden');
    $('#search').value = '';
    return go('profile', user.dataset.user);
  }

  const fl = hit('data-follow');
  if (fl) return toggleFollow(fl.dataset.follow);

  const st = hit('data-story');
  if (st) return openStory(st.dataset.story);

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

  const del = hit('data-del');
  if (del) return removePost(del.dataset.del);

  const dc = hit('data-delcmt');
  if (dc) {
    e.preventDefault();
    try {
      await DB.deleteComment(dc.dataset.delcmt);
      const openId = $('#postDetail [data-form]');
      if (openId) await openPost(openId.dataset.form);
    } catch (ex) { toast(ex.message); }
    return;
  }

  const open = hit('data-open');
  if (open) return openPost(open.dataset.open);

  if (!t.closest('.search-wrap')) $('#searchResults').classList.add('hidden');
});

document.addEventListener('dblclick', (e) => {
  const wrap = e.target.closest('[data-dbl]');
  if (!wrap) return;
  toggleLike(wrap.dataset.dbl, true);
  const b = $('.burst', wrap);
  b.classList.remove('go');
  void b.offsetWidth;
  b.classList.add('go');
});

document.addEventListener('submit', async (e) => {
  if (e.target.id === 'authForm') return submitAuth(e);
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const input = $('input', form);
  const text = input.value.trim();
  if (!text) return;
  const ok = await submitComment(form.dataset.form, text);
  if (ok) { input.value = ''; }
});

document.addEventListener('input', (e) => {
  const form = e.target.closest('[data-form]');
  if (form) $('button', form).classList.toggle('on', e.target.value.trim().length > 0);
  if (e.target.id === 'search') runSearch(e.target.value);
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });

/* Soạn bài */
$('#btnNewPost').addEventListener('click', () => {
  if (!requireLogin('Bạn cần đăng nhập để đăng bài')) return;
  resetComposer();
  openModal('#modalNew');
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
  if (v && !pendingBlob) { pv.src = v; pv.classList.remove('hidden'); }
  else if (!v && !pendingBlob) pv.classList.add('hidden');
});

/* ===================== Giao diện sáng/tối ===================== */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('insta-theme', t);
}
$('#btnTheme').addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

/* ===================== Khởi động ===================== */
function paintAuthUI() {
  const src = ME ? avatarOf(ME) : fallbackImage('guest');
  $$('#navAvatar, #navAvatar2').forEach((img) => { img.src = src; img.dataset.seed = ME ? ME.username : 'guest'; });
  $('#btnLoginTop').classList.toggle('hidden', !!ME);
}

async function syncSession() {
  ME = await DB.currentProfile();
  FOLLOWING = ME ? await DB.following() : [];
  paintAuthUI();
}

(async function start() {
  applyTheme(localStorage.getItem('insta-theme')
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  setAuthMode('login');

  await syncSession();
  await go('home');

  const m = location.hash.match(/^#post-(.+)$/);
  if (m) openPost(m[1]);

  // đăng nhập/đăng xuất ở tab khác cũng được đồng bộ
  DB.onAuthChange(async () => {
    const prev = ME && ME.id;
    await syncSession();
    if ((ME && ME.id) !== prev) refresh();
  });
})();
