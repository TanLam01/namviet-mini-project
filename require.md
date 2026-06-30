# YÊU CẦU HỆ THỐNG ĐẶT VÉ CONCERT (MINI TICKETBOX)

Tài liệu này phân tích chi tiết các yêu cầu nghiệp vụ và kỹ thuật cần thực hiện cho cả hai phía **Backend (BE)** và **Frontend (FE)** dựa trên đề bài thi tuyển dụng của Nam Việt Media.

---

## 1. TỔNG QUAN HỆ THỐNG
* **Mục tiêu**: Xây dựng ứng dụng Fullstack (Backend API + Frontend Web) mô phỏng hệ thống bán vé Concert ca nhạc giới hạn **500 vé**.
* **Đặc thù tải cao**: Khi mở bán, dự kiến có khoảng **5.000 người dùng** truy cập đồng thời, thực hiện refresh (F5) liên tục và đặt vé tại cùng một thời điểm.
* **Tech Stack**: Ứng viên tự do lựa chọn ngôn ngữ, framework và cơ sở dữ liệu phù hợp nhất.

---

## 2. PHÂN TÍCH YÊU CẦU BACKEND (BE)

### 2.1. Quản lý kho vé (Ticket Inventory Management)
* **Cơ sở dữ liệu**:
  * Định nghĩa cấu trúc dữ liệu cho đối tượng `Ticket` gồm:
    * `Loại vé` (ví dụ: VIP, GA, Standard,...)
    * `Giá vé`
    * `Số lượng tồn kho`
    * `Trạng thái vé` (Gồm 3 trạng thái bắt buộc: `Trống (Available)` / `Đang giữ (Holding)` / `Đã bán (Sold)`)
* **Kiểm soát số lượng**: Tổng số lượng vé bán ra không được vượt quá **500 vé**.

### 2.2. Luồng Giữ Vé & Đặt Vé (Hold & Reserve Flow)
* **Giữ vé tạm thời**:
  * Khi người dùng chọn vé và nhấn "Đặt vé", Backend chuyển trạng thái vé sang `Đang giữ (Holding)` và ghi nhận thời gian bắt đầu giữ vé.
  * Giới hạn thời gian giữ vé là **5 phút** để người dùng điền thông tin và thanh toán.
* **Khóa tài nguyên (Concurrency Locking)**:
  * Trong 5 phút này, không cho phép bất kỳ người dùng nào khác chọn hoặc thao tác với những vé đang ở trạng thái `Holding` đó.
* **Tự động nhả vé (Auto-release)**:
  * Backend cần có một cơ chế (ví dụ: cron job, background worker, redis key expiration events, hoặc event-driven scheduler) chạy ngầm để quét các vé hết hạn giữ vé (sau 5 phút) mà chưa thanh toán.
  * Khi hết hạn, tự động cập nhật trạng thái vé từ `Đang giữ (Holding)` về lại `Trống (Available)` để đưa vào kho cho người khác đặt.

### 2.3. Thanh Toán Giả Lập (Mock Payment API)
* **Xử lý thanh toán**:
  * Tạo API nhận thông tin thanh toán giả lập (luôn trả về thành công hoặc giả lập thành công).
  * Khi nhận tín hiệu thanh toán thành công, chuyển trạng thái vé từ `Đang giữ (Holding)` sang `Đã bán (Sold)`.

### 2.4. Yêu cầu Kỹ thuật cốt lõi (BE Focus)
* **Chống Over-selling (Bán quá số lượng)**:
  * **Giải quyết Race Condition**: Đây là tiêu chí đánh giá cốt lõi. Khi hàng ngàn request cùng tranh giành mua vé vào cùng một mili-giây, Backend phải đảm bảo không bán vượt quá số lượng vé tồn kho.
  * **Giải pháp đề xuất**:
    * Sử dụng *Database Locking* (Pessimistic Write Lock / Optimistic Lock).
    * Hoặc sử dụng *Distributed Lock* (Redis Lock - Redlock).
    * Hoặc sử dụng cơ chế *Message Queue* để xếp hàng xử lý tuần tự (FIFO) nhằm giảm tải trực tiếp lên Database.
    * Tận dụng tính nguyên tố (Atomic Operations) của Redis (ví dụ: `DECRBY`, Lua Scripts) để kiểm tra tồn kho nhanh trước khi ghi xuống DB.
* **Chất lượng mã nguồn (Clean Code & Architecture)**:
  * Tổ chức cấu trúc thư mục dự án rõ ràng, mạch lạc.
  * Thiết lập cơ chế xử lý lỗi tập trung (**Global Error Handling**).
  * Xác thực dữ liệu đầu vào chặt chẽ (**Data Validation** tại lớp Gateway/Controller).
  * Viết **Unit Tests** bao phủ các logic nghiệp vụ quan trọng (logic tính toán tồn kho, logic giữ vé 5 phút và thanh toán).

---

## 3. PHÂN TÍCH YÊU CẦU FRONTEND (FE)

### 3.1. Trang chủ Sự kiện (Event Homepage)
* **Hiển thị thông tin**:
  * Thông tin chi tiết về sự kiện Concert ca nhạc.
  * **Cập nhật số lượng vé còn lại theo thời gian thực (Real-time)**:
    * Khi số lượng vé thay đổi ở Backend (được giữ hoặc đã bán), Frontend cần cập nhật hiển thị ngay lập tức mà không cần người dùng tải lại trang (F5).
    * **Giải pháp đề xuất**: Sử dụng WebSockets (Socket.IO), Server-Sent Events (SSE), hoặc cơ chế Short/Long Polling.

### 3.2. Màn hình Đặt vé (Booking Page)
* **Giao diện đặt vé**:
  * Cho phép người dùng chọn loại vé và số lượng vé mong muốn.
  * Điền thông tin cá nhân/thông tin liên hệ cần thiết.
* **Đồng hồ đếm ngược (Countdown Timer)**:
  * Ngay khi vé được giữ thành công, hiển thị đồng hồ đếm ngược **5:00** phút.
  * Khi hết thời gian đếm ngược mà chưa hoàn tất thanh toán, Frontend hiển thị thông báo hết hạn và đưa người dùng trở lại màn hình chọn vé ban đầu.
  * **Độ chính xác**: Thời gian countdown trên FE phải được đồng bộ chính xác với mốc thời gian hết hạn thực tế lưu trữ ở BE (đề phòng trường hợp lag mạng hoặc lệch múi giờ máy client).

### 3.3. Dashboard Quản trị (Admin Page)
* **Thống kê đơn giản**:
  * Hiển thị tổng số lượng vé đã bán và số lượng vé còn lại.
  * Hiển thị tổng doanh thu tạm tính dựa trên số vé đã bán.
  * Danh sách các vé hiện đang bị khóa tạm thời (`Holding`) kèm thời gian giữ vé còn lại.

### 3.4. Trải nghiệm người dùng dưới tải cao (FE UX Focus)
* **Chặn spam click**:
  * Disable nút bấm ngay sau khi click chọn vé hoặc thanh toán, hiển thị trạng thái loading nhằm tránh gửi trùng lặp request (Double submission/Spamming).
* **Quản lý trạng thái loading & phản hồi chậm**:
  * Có cơ chế UI/UX mượt mà (Skeleton loading, Spinners) khi server phản hồi chậm dưới tải cao.
  * Hiển thị thông báo thân thiện nếu xảy ra lỗi do hệ thống quá tải (Rate limit, Queue đầy...).

---

## 4. HƯỚNG DẪN TRIỂN KHAI VÀ NỘP BÀI

### 4.1. Cấu trúc Source Code khuyến nghị
```text
mini-ticketbox/
├── backend/          # Chứa source code Backend
│   ├── src/
│   ├── tests/        # Unit tests cho các logic cốt lõi
│   ├── Dockerfile
│   └── ...
├── frontend/         # Chứa source code Frontend
│   ├── src/
│   ├── Dockerfile
│   └── ...
├── docker-compose.yml # File cấu hình chạy toàn bộ hệ thống (nếu có)
└── README.md         # Hướng dẫn chạy và giải trình kiến trúc
```

### 4.2. Yêu cầu trong file `README.md`
1. **Thông tin ứng viên**: Họ tên, Email, Số điện thoại.
2. **Hướng dẫn chạy local**: Các bước setup cụ thể, ưu tiên sử dụng Docker & Docker Compose (`docker compose up`) để người chấm bài dễ dàng chạy thử mà không gặp lỗi môi trường.
3. **Giải trình Kỹ thuật**:
   * Sơ đồ thiết kế Database & luồng xử lý chính.
   * Giải thích phương án giải quyết bài toán Concurrency (chống over-selling) và cơ chế tự động giải phóng vé sau 5 phút.
   * Các quyết định kiến trúc và lý do lựa chọn Tech Stack.

### 4.3. Nộp bài
* **Repository**: Upload mã nguồn lên GitHub (Public hoặc Private).
  * Nếu chọn Private: Mời tài khoản GitHub `namviettech` làm collaborator.
* **Email phản hồi**: Reply lại email của HR (`hr@namvietmedia.com.vn`) kèm link Repository và tên tài khoản GitHub của bạn trước **23:59 ngày 03/07/2026**.
