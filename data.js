/* Dữ liệu mẫu ban đầu. Sau lần chạy đầu tiên mọi thay đổi được lưu vào localStorage. */

const IMG = (seed, w = 900, h = 900) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const AV  = (seed) => `https://picsum.photos/seed/av-${seed}/150/150`;

const SEED_USERS = [
  { id: 'me',        name: 'ban_cua_toi',  full: 'Người dùng',      bio: 'Xin chào 👋\nĐây là trang cá nhân của tôi.', avatar: AV('me') },
  { id: 'linh.ng',   name: 'linh.ng',      full: 'Nguyễn Linh',     bio: 'Sài Gòn ☕',            avatar: AV('linh') },
  { id: 'travel_vn', name: 'travel_vn',    full: 'Việt Nam Ơi',     bio: 'Đi để trở về 🇻🇳',      avatar: AV('travel') },
  { id: 'minh.chef', name: 'minh.chef',    full: 'Minh Bếp',        bio: 'Nấu ăn mỗi ngày 🍜',    avatar: AV('chef') },
  { id: 'anhpham',   name: 'anhpham',      full: 'Ánh Phạm',        bio: 'Chụp ảnh phim 📷',      avatar: AV('anh') },
  { id: 'daily.cat', name: 'daily.cat',    full: 'Mèo Mỗi Ngày',    bio: 'Meo meo 🐈',            avatar: AV('cat') },
  { id: 'hoang.dev', name: 'hoang.dev',    full: 'Hoàng Dev',       bio: 'Code & cà phê',         avatar: AV('dev') },
];

const hoursAgo = (h) => Date.now() - h * 3600 * 1000;

const SEED_POSTS = [
  {
    id: 'p1', user: 'travel_vn', image: IMG('halong'), location: 'Vịnh Hạ Long',
    caption: 'Bình minh trên vịnh, không có gì đẹp bằng 🌅', likes: 1284, liked: false, saved: false,
    time: hoursAgo(2),
    comments: [
      { user: 'linh.ng', text: 'Đẹp quá trời!', time: hoursAgo(1) },
      { user: 'anhpham', text: 'Cho hỏi chụp máy gì vậy ạ?', time: hoursAgo(1) },
    ],
  },
  {
    id: 'p2', user: 'minh.chef', image: IMG('pho'), location: 'Hà Nội',
    caption: 'Phở bò tái nạm, công thức nhà làm. Ai muốn xin recipe thì comment nhé 🍜',
    likes: 843, liked: true, saved: true, time: hoursAgo(5),
    comments: [
      { user: 'daily.cat', text: 'Recipe với ạ 🙏', time: hoursAgo(4) },
      { user: 'hoang.dev', text: 'Nhìn là đói rồi', time: hoursAgo(3) },
      { user: 'me', text: 'Ngon xuất sắc', time: hoursAgo(2) },
    ],
  },
  {
    id: 'p3', user: 'anhpham', image: IMG('film-street'), location: 'Đà Lạt',
    caption: 'Một buổi chiều lang thang. Kodak Gold 200.', likes: 512, liked: false, saved: false,
    time: hoursAgo(9),
    comments: [{ user: 'travel_vn', text: 'Tông màu này ghiền thật', time: hoursAgo(8) }],
  },
  {
    id: 'p4', user: 'daily.cat', image: IMG('kitten'), location: '',
    caption: 'Chủ nhật của boss 😼', likes: 2317, liked: true, saved: false, time: hoursAgo(20),
    comments: [
      { user: 'linh.ng', text: 'Cưng quá đi mất 😻', time: hoursAgo(19) },
      { user: 'minh.chef', text: 'Cho xin một bé', time: hoursAgo(14) },
    ],
  },
  {
    id: 'p5', user: 'hoang.dev', image: IMG('desk-setup'), location: 'Đà Nẵng',
    caption: 'Setup mới, code cả ngày không mỏi 💻', likes: 396, liked: false, saved: false,
    time: hoursAgo(30),
    comments: [{ user: 'anhpham', text: 'Bàn phím gì đó bạn?', time: hoursAgo(28) }],
  },
  {
    id: 'p6', user: 'linh.ng', image: IMG('coffee-sg'), location: 'Quận 1, TP.HCM',
    caption: 'Cà phê sữa đá và một buổi sáng chậm rãi ☕', likes: 671, liked: false, saved: true,
    time: hoursAgo(46),
    comments: [],
  },
];

const SEED_STORIES = [
  { user: 'me',        image: IMG('story-me', 720, 1280),     seen: false, time: hoursAgo(1) },
  { user: 'linh.ng',   image: IMG('story-linh', 720, 1280),   seen: false, time: hoursAgo(3) },
  { user: 'travel_vn', image: IMG('story-travel', 720, 1280), seen: false, time: hoursAgo(4) },
  { user: 'minh.chef', image: IMG('story-chef', 720, 1280),   seen: false, time: hoursAgo(6) },
  { user: 'anhpham',   image: IMG('story-anh', 720, 1280),    seen: true,  time: hoursAgo(11) },
  { user: 'daily.cat', image: IMG('story-cat', 720, 1280),    seen: true,  time: hoursAgo(13) },
  { user: 'hoang.dev', image: IMG('story-dev', 720, 1280),    seen: true,  time: hoursAgo(18) },
];

/* Ảnh dự phòng khi không có mạng: gradient SVG sinh từ chuỗi bất kỳ */
function fallbackImage(text = '') {
  let h = 0;
  for (const c of String(text)) h = (h * 31 + c.charCodeAt(0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h},70%,62%)"/>
      <stop offset="1" stop-color="hsl(${(h + 60) % 360},70%,45%)"/>
    </linearGradient></defs>
    <rect width="600" height="600" fill="url(#g)"/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
