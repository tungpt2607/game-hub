# Hướng dẫn dùng trình sửa code trong CMS

Trình sửa code nằm ở **CMS → Game → (chọn một game)**. Nó được làm giống VS Code: ai đã quen VS Code dùng được ngay, chưa quen thì đọc tài liệu này từ trên xuống.

Cách viết một game (cấu trúc gói, `schema.ts`, `asset('…')`, phát hành) nằm ở [Hướng dẫn viết game](viet-game.md).

## 1. Màn hình gồm những gì

```
┌──────────────┬───────────────────────────────────────────────┬──────────────┐
│ 📁 🔍        │ schema.ts │ config.ts ● │ Runtime.tsx   ↶ ↷ 🔍 ⋮ │              │
│ FILE CỦA GAME│ components › Runtime.tsx › SampleRuntime      │   Khung      │
│ ▸ assets     │                                               │   điện thoại │
│   schema.ts  │   (khung code)                                │   chạy thử   │
│   config.ts  │                                               │              │
│   …          ├───────────────────────────────────────────────┤              │
│              │ Vấn đề (2) │ Tham chiếu          (bảng dưới)  │              │
├──────────────┴───────────────────────────────────────────────┤              │
│ ⓧ 1 ⚠ 1   Đang biên dịch…        Dòng 12, Cột 5  TypeScript  │              │
└──────────────────────────────────────────────────────────────┘──────────────┘
```

| Phần | Dùng để |
|---|---|
| **Cột trái**, nút 📁 | Cây thư mục: mọi file của game, gồm cả `assets/` |
| **Cột trái**, nút 🔍 | Tìm và thay chữ trong cả game |
| **Hàng tab** | Các file đang mở. Tab chữ nghiêng là tab xem tạm; **●** là file đã sửa mà chưa lưu |
| **↶ ↷ 🔍 ⋮** bên phải hàng tab | Hoàn tác, Huỷ hoàn tác, Tìm trong file, Bảng lệnh |
| **Thanh đường dẫn** dưới hàng tab | Thư mục › file › hàm đang đặt con trỏ; bấm tên hàm để mở danh sách hàm |
| **Bảng dưới** | **Vấn đề** (mọi lỗi của game) và **Tham chiếu** (kết quả "tìm mọi chỗ dùng") |
| **Thanh trạng thái** (màu xanh, dưới cùng) | Số lỗi ⓧ và cảnh báo ⚠ (bấm để mở bảng Vấn đề), trạng thái biên dịch, dòng/cột, ngôn ngữ, bật/tắt tự định dạng |
| **Khung điện thoại** bên phải | Chạy thử game ngay khi biên dịch xong |

Trên điện thoại:
- Cột trái nằm trong ngăn trượt ra từ nút **☰**.
- Khung chạy thử nằm ở tab **Chạy thử**.
- Cạnh hàng tab có thêm nút **Đi tới định nghĩa** và **Quay lại** thay cho phím tắt.

## 2. Phím tắt

Trên máy Mac, dùng **Cmd** thay cho **Ctrl**.

| Phím | Tác dụng |
|---|---|
| **Ctrl+S** | Lưu nháp |
| **Ctrl+P** | Tìm và mở nhanh một file theo tên |
| **Ctrl+Shift+P** | Bảng lệnh: gõ tên lệnh để chạy |
| **Ctrl+F** | Tìm và thay trong file đang mở |
| **Ctrl+Shift+F** | Tìm và thay trong cả game |
| **Ctrl+Shift+O** | Đi tới một hàm, biến trong file đang mở |
| **Ctrl+Space** | Mở gợi ý code |
| **F12** hoặc **Ctrl+bấm chuột** | Đi tới định nghĩa |
| **Shift+F12** | Tìm mọi chỗ dùng |
| **F2** (trong khung code) | Đổi tên biến/hàm/kiểu trong cả game |
| **F2** (trong cây thư mục) | Đổi tên file/thư mục |
| **Delete** (trong cây thư mục) | Xoá file/thư mục |
| **Shift+Alt+F** | Định dạng file đang mở |
| **Alt+←** / **Alt+→** | Quay lại / Đi tiếp sau khi nhảy tới chỗ khác |
| **Ctrl+Z** / **Ctrl+Shift+Z** | Hoàn tác / Huỷ hoàn tác |
| **Ctrl+/** | Chuyển dòng thành chú thích (comment) và ngược lại |
| **Alt+↑** / **Alt+↓** | Chuyển dòng lên/xuống |
| **Ctrl+D** | Chọn thêm chỗ giống chữ đang chọn (sửa nhiều chỗ cùng lúc) |
| **Ctrl+[** / **Ctrl+]** hoặc **Tab** / **Shift+Tab** | Thụt dòng ra/vào |

Không nhớ phím tắt thì mở **Bảng lệnh** (Ctrl+Shift+P, hoặc nút **⋮**): mọi lệnh đều có ở đó, kèm phím tắt bên phải.

## 3. Viết code nhanh hơn

### Gợi ý code
- Gõ vài chữ, hoặc gõ dấu chấm sau tên biến (`config.`, `host.`), là danh sách gợi ý hiện ra. Gợi ý hiểu kiểu dữ liệu, nên `config.look.` chỉ hiện các trường có trong nhóm `look`.
- Chọn bằng **↑ ↓**, nhận bằng **Enter**, bỏ qua bằng **Esc**. Bên cạnh danh sách có kiểu dữ liệu và chú thích của mục đang chọn.
- Gợi ý ghi **"tự import từ …"**: chọn mục đó thì dòng `import` được tự thêm lên đầu file. Ví dụ gõ `useSou` rồi chọn `useSound` sẽ thêm `import { useSound } from '@opes/module-sdk/react'`.
- Trong `asset('…')`, gợi ý liệt kê đúng các file đang có trong `assets/`.

Lần đầu mở trình sửa code, gợi ý cần vài giây để tải (thanh trạng thái ghi **Đang tải gợi ý code…**). Các lần sau trình duyệt đã nhớ nên nhanh hơn.

### Xem kiểu và chú thích
Rê chuột lên một tên biến, hàm hay kiểu để xem kiểu dữ liệu và chú thích của nó.

### Lỗi ngay khi gõ
- Lỗi kiểu được **gạch đỏ** ngay trong khung code; rê chuột lên chỗ gạch để đọc lỗi.
- Tab và file trong cây thư mục có lỗi thì chữ chuyển màu đỏ, kèm số lỗi.
- **Bảng Vấn đề** gộp mọi lỗi của cả game: lỗi **biên dịch** (chặn phát hành) và lỗi **kiểu** (nên sửa, nhưng không chặn phát hành). Bấm vào một lỗi để nhảy tới đúng dòng.

### Định dạng code
- **Shift+Alt+F** định dạng file đang mở: thụt dòng, dấu cách, dấu nháy cho đều, giống Prettier trong VS Code.
- Muốn mỗi lần **Lưu nháp** là tự định dạng mọi file đã sửa: bấm **Tự định dạng: tắt** ở thanh trạng thái để chuyển thành **bật**, hoặc dùng lệnh **Bật tự định dạng khi lưu**. Tuỳ chọn này nhớ trên trình duyệt của bạn.
- File còn lỗi cú pháp thì không định dạng được; sửa lỗi trước rồi định dạng.

## 4. Di chuyển trong code

### Đi tới định nghĩa
- **Ctrl+bấm chuột**, hoặc đặt con trỏ vào tên rồi bấm **F12**, để nhảy tới chỗ khai báo, kể cả ở file khác.
- Nếu khai báo nằm trong thư viện (React, `@opes/module-sdk`), CMS mở một **tab chỉ đọc** để bạn xem, không sửa được.
- **Alt+←** để quay lại chỗ cũ; **Alt+→** để đi tiếp.

### Tìm mọi chỗ dùng
**Shift+F12** trên một tên: bảng **Tham chiếu** ở dưới liệt kê mọi chỗ dùng tên đó, nhóm theo file. Bấm một dòng để nhảy tới.

### Đổi tên trong cả game
Đặt con trỏ vào tên biến, hàm hoặc kiểu rồi bấm **F2**, gõ tên mới. Mọi chỗ dùng trong cả game được đổi theo, kể cả ở file khác. Tên khai báo trong thư viện thì không đổi được.

### Danh sách hàm trong file
**Ctrl+Shift+O**, hoặc bấm tên hàm trên thanh đường dẫn: hiện các hàm, hằng, kiểu… trong file. Gõ vài chữ để lọc rồi **Enter** để nhảy tới.

### Mở nhanh file
**Ctrl+P**, gõ vài chữ trong tên file (không cần đúng thứ tự liền nhau, ví dụ `rntm` tìm ra `Runtime.tsx`), rồi **Enter**.

## 5. Tìm và thay

### Trong file đang mở (Ctrl+F)
```
›  [Tìm            ] Aa ab .*   2/7   ↑ ↓ ✕
   [Thay bằng      ]  ⇄  ⇄⇄
```
- **Aa**: phân biệt chữ hoa, chữ thường.
- **ab**: chỉ khớp nguyên từ, ví dụ tìm `score` sẽ không khớp `scoreBoard`.
- **.\***: tìm bằng biểu thức chính quy.
- **2/7**: đang ở kết quả thứ 2 trong 7 kết quả.
- **Enter** / **Shift+Enter** (hoặc **↓** / **↑**) để đi tới kết quả sau / trước. **Esc** hoặc **✕** để đóng.
- Bấm **›** để hiện dòng **Thay bằng**. **⇄** thay chỗ đang chọn; **⇄⇄** thay tất cả.

### Trong cả game (Ctrl+Shift+F)
- Gõ vào ô tìm ở cột trái. Kết quả nhóm theo file; bấm một dòng để mở đúng chỗ.
- Có cùng ba nút **Aa / ab / .\*** như khi tìm trong file.
- Bấm **›** để hiện ô **Thay bằng**. Danh sách kết quả cho xem trước: chữ cũ gạch ngang, chữ mới nền xanh.
- Bấm **Thay tất cả** để thay trong mọi file, hoặc **Thay trong file** ở dòng tên một file để chỉ thay file đó.
- Chỉ tìm trong file code, không tìm trong ảnh hay âm thanh.

Thay xong vẫn hoàn tác được bằng **Ctrl+Z** trong từng file, hoặc bấm **Bỏ bản nháp** nếu chưa lưu.

## 6. Quản lý file

Chuột phải vào một mục trong cây thư mục, hoặc bấm nút **⋯** bên cạnh (trên điện thoại nút này luôn hiện):

| Lệnh | Ghi chú |
|---|---|
| Tạo file code / Tạo thư mục | File code không đặt trong `assets/` |
| Tải file lên | Ảnh, âm thanh, font luôn được đặt vào `assets/` |
| Đổi tên (F2) / Di chuyển tới… | Nếu code khác đang trỏ tới file này, CMS hỏi **Cập nhật các chỗ trỏ tới?** |
| Chép đường dẫn / Chép cách dùng `asset('…')` | |
| Xoá (Delete) | Chỉ xoá khỏi bản nháp; phiên bản đã phát hành vẫn giữ |

Trên máy tính có thể:
- kéo thả một file sang thư mục khác;
- kéo ảnh từ máy tính thả thẳng vào một thư mục trong `assets/`.

## 7. Lưu, an toàn và phát hành

- **Lưu nháp** (Ctrl+S): lưu được cả khi còn lỗi. Dòng **"Chưa lưu"** chỉ hiện khi nội dung thật sự khác bản đã lưu.
- **Rời trang khi chưa lưu**: bấm sang mục khác trong CMS, đóng hoặc tải lại trang thì CMS hỏi trước.
- **Bản tạm trên trình duyệt**: thay đổi chưa lưu được giữ tạm trên trình duyệt. Lỡ đóng tab hay máy tắt thì lần sau mở game sẽ có dòng hỏi **Khôi phục** / **Bỏ đi**. CMS không tự khôi phục.
- **Phát hành**: hộp phát hành liệt kê các file khác với bản đang chạy. Bấm vào một file để xem từng dòng thay đổi (xanh là thêm, đỏ là xoá) trước khi bấm **Phát hành**.

## 8. Câu hỏi thường gặp

**Gạch đỏ dưới `import` từ một thư viện lạ?**
Game chỉ dùng được React và `@opes/module-sdk` (xem [Hướng dẫn viết game](viet-game.md#b6-thư-viện-được-dùng)).

**Lỗi kiểu có chặn phát hành không?**
Không. Chỉ lỗi **biên dịch** (và game lỗi khi chạy thử) mới chặn. Nhưng lỗi kiểu thường là dấu hiệu code sẽ chạy sai, nên sửa.

**Gợi ý code không hiện?**
Chờ thanh trạng thái hết dòng **Đang tải gợi ý code…**. Nếu thấy **Không tải được gợi ý code**, tải lại trang. Lưu nháp trước nếu có thay đổi.

**Sửa nhầm nhiều chỗ?**
Dùng **Ctrl+Z** trong từng file. Hoặc bấm **Bỏ bản nháp** để quay về bản đã phát hành, hoặc mở **Phiên bản → Lấy làm bản nháp** để lấy lại code của một bản cũ.
