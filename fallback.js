/* Ảnh dự phòng: sinh một gradient ổn định từ chuỗi bất kỳ.
   Dùng cho ảnh đại diện chưa đặt và cho ảnh tải lỗi. */
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
