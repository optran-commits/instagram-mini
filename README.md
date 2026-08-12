# Instagram Mini

Website đơn giản mô phỏng Instagram, viết bằng HTML + CSS + JavaScript thuần. Không cần cài đặt, không cần server.

## Chạy thế nào

Mở file `index.html` bằng trình duyệt (nhấp đúp là được).

## Tính năng

- **Feed**: danh sách bài viết, thích, bình luận, lưu, chia sẻ (sao chép link)
- **Nhấp đúp vào ảnh** để thích (có hiệu ứng trái tim)
- **Stories**: thanh tin ở đầu trang, tự chuyển sau 5 giây, vòng màu chuyển xám khi đã xem
- **Tạo bài viết**: chọn ảnh từ máy (kéo–thả cũng được) hoặc dán link ảnh, thêm chú thích và vị trí. Ảnh được tự động nén trước khi lưu.
- **Khám phá**: lưới ảnh 3 cột, di chuột hiện số lượt thích / bình luận
- **Trang cá nhân**: ảnh đại diện, tiểu sử, số liệu, lưới bài viết; xoá bài viết của mình qua nút `···`
- **Đã lưu**: xem lại các bài đã đánh dấu (biểu tượng cờ ở thanh dưới trên mobile)
- **Tìm kiếm** người dùng theo tên
- **Chế độ sáng/tối**: nút hình mặt trăng trên thanh trên cùng
- **Responsive**: có thanh điều hướng dưới cùng trên màn hình nhỏ
- Phím `Esc` để đóng cửa sổ đang mở

## Dữ liệu

Toàn bộ dữ liệu lưu trong `localStorage` của trình duyệt, key `insta-mini-v1`.
Muốn khôi phục dữ liệu mẫu ban đầu, mở Console (F12) và chạy:

```js
localStorage.removeItem('insta-mini-v1'); location.reload();
```

## Cấu trúc

| File | Nội dung |
|---|---|
| `index.html` | Khung trang, thanh điều hướng, các cửa sổ modal |
| `styles.css` | Toàn bộ giao diện, biến màu cho theme sáng/tối, responsive |
| `data.js` | Dữ liệu mẫu (người dùng, bài viết, stories) + ảnh dự phòng khi mất mạng |
| `app.js` | Trạng thái, render, router, xử lý sự kiện |

> Ảnh mẫu lấy từ `picsum.photos`. Nếu không có mạng, ảnh sẽ tự thay bằng gradient màu.
