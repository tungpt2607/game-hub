/** Chuỗi giao diện tiếng Việt. Thêm ngôn ngữ mới bằng một file cùng cấu trúc. */
export const vi = {
  app: {
    name: 'Game Hub OPES',
  },
  cms: {
    title: 'Game Hub OPES – Quản trị',
    login: {
      heading: 'Đăng nhập',
      email: 'Email',
      password: 'Mật khẩu',
      submit: 'Đăng nhập',
      skeletonNote: 'Bản khung: chưa kiểm tra tài khoản. Đăng nhập thật có ở Bước 4.',
    },
    nav: {
      overview: 'Tổng quan',
      templates: 'Thư viện template',
      media: 'Media',
      users: 'Tài khoản',
      comingIn: 'Có ở bước {step}',
    },
    overview: {
      heading: 'Tổng quan',
      lead: 'Khung CMS của giai đoạn 1. Các chức năng sẽ được bật dần theo từng bước.',
      apiStatus: 'Kết nối API',
      apiOk: 'Hoạt động',
      apiDown: 'Không kết nối được',
      apiChecking: 'Đang kiểm tra…',
      apiVersion: 'Phiên bản {version}',
      roadmap: 'Lộ trình giai đoạn 1',
      done: 'Xong',
      inProgress: 'Đang làm',
      upcoming: 'Sắp tới',
    },
  },
  play: {
    title: 'Game Hub OPES',
    home: {
      heading: 'Game Hub OPES',
      lead: 'Mở link chơi thử mà bạn nhận được để bắt đầu chơi.',
    },
    try: {
      preparing: 'Đang chuẩn bị game…',
      preparingNote: 'Trang chơi thử sẽ hoạt động từ Bước 6.',
      badge: 'Bản chơi thử – không có quà thật',
    },
  },
} as const;
