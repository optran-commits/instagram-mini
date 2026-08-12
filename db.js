/* ============================================================
   Lớp truy cập dữ liệu — Supabase (Postgres + Auth + Storage)
   Mọi quyền ghi đều được kiểm tra lại bằng RLS ở phía máy chủ.
   ============================================================ */

const sb = window.supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.key,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

/* Ném lỗi kèm thông điệp tiếng Việt dễ hiểu */
function check({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

const DB = {
  /* ---------------- Auth ---------------- */

  async session() {
    const { data } = await sb.auth.getSession();
    return data.session;
  },

  async currentProfile() {
    const s = await this.session();
    if (!s) return null;
    const { data, error } = await sb
      .from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    if (error) return null;
    return data;
  },

  onAuthChange(cb) {
    sb.auth.onAuthStateChange((_e, session) => cb(session));
  },

  async signUp(email, password, username) {
    const { data, error } = await sb.auth.signUp({
      email, password, options: { data: { username } },
    });
    if (error) {
      if (/already registered/i.test(error.message)) throw new Error('Email này đã được đăng ký');
      if (/at least/i.test(error.message)) throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
      throw new Error(error.message);
    }
    // Nếu dự án bật xác minh email thì chưa có session ngay
    return { needsEmailConfirm: !data.session, session: data.session };
  },

  async signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (/Invalid login/i.test(error.message)) throw new Error('Email hoặc mật khẩu không đúng');
      if (/not confirmed/i.test(error.message)) throw new Error('Bạn cần xác minh email trước khi đăng nhập');
      throw new Error(error.message);
    }
  },

  async signOut() { await sb.auth.signOut(); },

  /* ---------------- Hồ sơ ---------------- */

  async profileById(id) {
    return check(await sb.from('profiles').select('*').eq('id', id).maybeSingle(), 'Tải hồ sơ');
  },

  async profileByUsername(username) {
    return check(await sb.from('profiles').select('*').eq('username', username).maybeSingle(), 'Tải hồ sơ');
  },

  async searchProfiles(q) {
    if (!q.trim()) return [];
    return check(
      await sb.from('profiles').select('*')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`).limit(8),
      'Tìm kiếm'
    ) || [];
  },

  async suggestions(excludeId, limit = 5) {
    let q = sb.from('profiles').select('*').limit(limit);
    if (excludeId) q = q.neq('id', excludeId);
    return check(await q, 'Gợi ý') || [];
  },

  async updateProfile(patch) {
    const s = await this.session();
    if (!s) throw new Error('Bạn cần đăng nhập');
    return check(
      await sb.from('profiles').update(patch).eq('id', s.user.id).select().single(),
      'Cập nhật hồ sơ'
    );
  },

  async profileStats(userId) {
    const [posts, followers, following] = await Promise.all([
      sb.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      sb.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      sb.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    return { posts: posts.count || 0, followers: followers.count || 0, following: following.count || 0 };
  },

  /* ---------------- Bài viết ---------------- */

  /* Gắn thêm trạng thái đã thích / đã lưu của chính mình vào danh sách bài viết */
  async _decorate(rows) {
    const s = await this.session();
    if (!s || !rows.length) return rows.map((r) => ({ ...r, liked: false, saved: false }));
    const ids = rows.map((r) => r.id);
    const [likes, saves] = await Promise.all([
      sb.from('likes').select('post_id').eq('user_id', s.user.id).in('post_id', ids),
      sb.from('saves').select('post_id').eq('user_id', s.user.id).in('post_id', ids),
    ]);
    const L = new Set((likes.data || []).map((x) => x.post_id));
    const S = new Set((saves.data || []).map((x) => x.post_id));
    return rows.map((r) => ({ ...r, liked: L.has(r.id), saved: S.has(r.id) }));
  },

  async feed(limit = 30) {
    const rows = check(
      await sb.from('post_feed').select('*').order('created_at', { ascending: false }).limit(limit),
      'Tải bảng tin'
    ) || [];
    return this._decorate(rows);
  },

  async postsByUser(userId) {
    const rows = check(
      await sb.from('post_feed').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }),
      'Tải bài viết'
    ) || [];
    return this._decorate(rows);
  },

  async post(id) {
    const row = check(await sb.from('post_feed').select('*').eq('id', id).maybeSingle(), 'Tải bài viết');
    if (!row) return null;
    return (await this._decorate([row]))[0];
  },

  async savedPosts() {
    const s = await this.session();
    if (!s) return [];
    const saves = check(await sb.from('saves').select('post_id').eq('user_id', s.user.id), 'Tải mục đã lưu') || [];
    if (!saves.length) return [];
    const rows = check(
      await sb.from('post_feed').select('*').in('id', saves.map((x) => x.post_id))
        .order('created_at', { ascending: false }),
      'Tải mục đã lưu'
    ) || [];
    return this._decorate(rows);
  },

  async createPost({ imageUrl, caption, location }) {
    const s = await this.session();
    if (!s) throw new Error('Bạn cần đăng nhập');
    return check(
      await sb.from('posts').insert({
        user_id: s.user.id, image_url: imageUrl,
        caption: caption || '', location: location || '',
      }).select().single(),
      'Đăng bài'
    );
  },

  async deletePost(id) {
    const { error } = await sb.from('posts').delete().eq('id', id);
    if (error) throw new Error(`Xoá bài viết: ${error.message}`);
  },

  /* ---------------- Thích / Lưu ---------------- */

  async setLike(postId, on) {
    const s = await this.session();
    if (!s) throw new Error('Bạn cần đăng nhập để thích bài viết');
    const { error } = on
      ? await sb.from('likes').upsert({ post_id: postId, user_id: s.user.id })
      : await sb.from('likes').delete().eq('post_id', postId).eq('user_id', s.user.id);
    if (error) throw new Error(`Thích bài viết: ${error.message}`);
  },

  async setSave(postId, on) {
    const s = await this.session();
    if (!s) throw new Error('Bạn cần đăng nhập để lưu bài viết');
    const { error } = on
      ? await sb.from('saves').upsert({ post_id: postId, user_id: s.user.id })
      : await sb.from('saves').delete().eq('post_id', postId).eq('user_id', s.user.id);
    if (error) throw new Error(`Lưu bài viết: ${error.message}`);
  },

  /* ---------------- Bình luận ---------------- */

  async comments(postId) {
    return check(
      await sb.from('comments')
        .select('id, body, created_at, user_id, profiles(username, avatar_url)')
        .eq('post_id', postId).order('created_at'),
      'Tải bình luận'
    ) || [];
  },

  async addComment(postId, body) {
    const s = await this.session();
    if (!s) throw new Error('Bạn cần đăng nhập để bình luận');
    return check(
      await sb.from('comments').insert({ post_id: postId, user_id: s.user.id, body })
        .select('id, body, created_at, user_id, profiles(username, avatar_url)').single(),
      'Gửi bình luận'
    );
  },

  async deleteComment(id) {
    const { error } = await sb.from('comments').delete().eq('id', id);
    if (error) throw new Error(`Xoá bình luận: ${error.message}`);
  },

  /* ---------------- Theo dõi ---------------- */

  async following() {
    const s = await this.session();
    if (!s) return [];
    const rows = check(await sb.from('follows').select('following_id').eq('follower_id', s.user.id), 'Tải theo dõi') || [];
    return rows.map((r) => r.following_id);
  },

  async setFollow(userId, on) {
    const s = await this.session();
    if (!s) throw new Error('Bạn cần đăng nhập');
    const { error } = on
      ? await sb.from('follows').upsert({ follower_id: s.user.id, following_id: userId })
      : await sb.from('follows').delete().eq('follower_id', s.user.id).eq('following_id', userId);
    if (error) throw new Error(`Theo dõi: ${error.message}`);
  },

  /* ---------------- Ảnh ---------------- */

  async uploadImage(blob, ext = 'jpg') {
    const s = await this.session();
    if (!s) throw new Error('Bạn cần đăng nhập để tải ảnh lên');
    const path = `${s.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from('post-images')
      .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
    if (error) throw new Error(`Tải ảnh lên: ${error.message}`);
    return sb.storage.from('post-images').getPublicUrl(path).data.publicUrl;
  },
};

window.DB = DB;
