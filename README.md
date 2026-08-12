# Instagram Mini

Website mô phỏng Instagram với **cơ sở dữ liệu thật** — bài viết, lượt thích và bình luận được chia sẻ giữa tất cả người dùng và mọi thiết bị.

🔗 **https://instagram-mini.vercel.app**

## Kiến trúc

Frontend là HTML + CSS + JavaScript thuần, không có bước build. Backend là Supabase.

| Thành phần | Công nghệ |
|---|---|
| Giao diện | HTML/CSS/JS thuần (không framework, không build) |
| Cơ sở dữ liệu | Supabase Postgres |
| Đăng nhập | Supabase Auth (email + mật khẩu) |
| Lưu ảnh | Supabase Storage (bucket `post-images`, tối đa 5 MB) |
| Phân quyền | Row Level Security ở phía máy chủ |
| Triển khai | Vercel (tự động deploy khi push lên `main`) |

## Tính năng

**Khách (chưa đăng nhập)** xem được bảng tin, trang khám phá, trang cá nhân và bình luận — nhưng không ghi được gì.

**Sau khi đăng nhập:**

- Đăng bài: kéo–thả ảnh, chọn tệp, hoặc dán link. Ảnh được nén (cạnh dài tối đa 1440px, JPEG 85%) rồi tải lên Supabase Storage.
- Thích (nhấp đúp vào ảnh cũng được), bình luận, lưu, theo dõi
- Xoá bài viết và bình luận của chính mình
- Tìm kiếm người dùng, trang cá nhân kèm số liệu thật
- Chế độ sáng/tối, responsive, phím `Esc` để đóng cửa sổ

## Bảo mật

Toàn bộ quyền ghi được ép buộc bằng **Row Level Security** trong Postgres, không phải bằng JavaScript phía trình duyệt. Kể cả khi ai đó sửa mã trong DevTools hay gọi thẳng REST API:

- chỉ ghi được dữ liệu mang `user_id` của chính mình
- chỉ xoá được bài viết và bình luận của chính mình
- chỉ tải ảnh lên được thư mục mang UID của chính mình

Khoá `sb_publishable_...` trong `config.js` được thiết kế để công khai — nó chỉ cho phép những gì RLS cho phép. Khoá bí mật (`SUPABASE_SERVICE_ROLE_KEY`, mật khẩu Postgres) nằm trong `.env.local` và **không** được commit.

## Cấu trúc

| File | Nội dung |
|---|---|
| `index.html` | Khung trang, thanh điều hướng, các cửa sổ modal |
| `styles.css` | Giao diện, biến màu sáng/tối, responsive |
| `config.js` | URL và khoá công khai của Supabase |
| `db.js` | Lớp truy cập dữ liệu (auth, bài viết, thích, bình luận, ảnh) |
| `app.js` | Render, điều hướng, xử lý sự kiện |
| `fallback.js` | Ảnh gradient dự phòng khi ảnh lỗi hoặc chưa có avatar |
| `supabase-schema.sql` | Bảng, RLS, trigger, bucket — chạy lại được nhiều lần |

## Chạy ở máy

Cần một máy chủ tĩnh (mở trực tiếp bằng `file://` sẽ bị chặn khi gọi API):

```bash
npx serve .
# rồi mở http://localhost:3000
```

## Thiết lập lại từ đầu

```bash
vercel link
vercel integration add supabase --plan free
vercel env pull
# rồi chạy supabase-schema.sql trên cơ sở dữ liệu
```

## Việc cần làm thủ công

Xác minh email đang **bật**, nên người đăng ký mới phải bấm liên kết trong email trước khi đăng nhập được. Muốn cho đăng nhập ngay lập tức (tiện khi demo), tắt nó trong Supabase Dashboard:

**Authentication → Sign In / Providers → Email → tắt "Confirm email"**

Mở dashboard bằng `vercel integration open supabase`.

> Ba tài khoản `demo.*@instagram-mini.test` là dữ liệu mẫu, được tạo bằng mật khẩu ngẫu nhiên nên không đăng nhập được — chúng chỉ đứng tên cho các bài viết mẫu.
