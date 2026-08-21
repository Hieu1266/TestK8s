import { Course } from "@/types/course";

export const mockCourses: Course[] = [
  {
    id: 'computer-architecture',
    title: 'Computer Architecture (Kiến trúc Máy tính)',
    description: 'Học về ELE 475 / COS 475 Introduction and Instruction Set Architectures tại Princeton University.',
    category: 'Khoa học Máy tính',
    instructor: 'Princeton University',
    progress: 4,
    modules: [
      {
        id: 'arch-m1',
        title: 'Mô-đun 1: Introduction and Instruction Set Architecture',
        lessons: [
          { id: 'arch-l1', title: 'Course Introduction', duration: '9 phút' },
          { id: 'arch-l2', title: 'Instruction Set Principles', duration: '12 phút' }
        ]
      }
    ]
  },
  {
    id: 'cissp-security',
    title: 'Tên miền CISSP 2: Bảo mật tài sản số',
    description: 'Khóa học chuyên sâu về bảo mật thông tin, phân loại và quản lý tài sản số, kiểm soát rủi ro dữ liệu theo chuẩn CISSP quốc tế.',
    category: 'An ninh mạng',
    instructor: 'Infosec',
    progress: 0,
    modules: [
      {
        id: 'cissp-m1',
        title: 'Mô-đun 1: Định nghĩa và Phân loại tài sản thông tin',
        lessons: [
          { id: 'cissp-l1', title: 'Giới thiệu về Quản lý tài sản số', duration: '12 phút' }
        ]
      }
    ]
  },
  {
    id: 'digital-security',
    title: 'An toàn và bảo mật kỹ thuật số cá nhân',
    description: 'Nền tảng bảo mật thông tin cá nhân và doanh nghiệp, cách phòng ngừa và ứng phó các cuộc tấn công mạng thông dụng.',
    category: 'An ninh mạng',
    instructor: 'Arizona State University',
    progress: 0,
    modules: [
      {
        id: 'dig-m1',
        title: 'Mô-đun 1: Các mối đe dọa an ninh mạng phổ biến',
        lessons: [
          { id: 'dig-l1', title: 'Phòng chống Malware và Phishing', duration: '20 phút' }
        ]
      }
    ]
  },
  {
    id: 'nextjs-mastery',
    title: 'Lập trình Fullstack với Next.js và Tailwind CSS',
    description: 'Xây dựng ứng dụng web hiệu năng cao, tối ưu SEO, kiến trúc App Router và kết nối cơ sở dữ liệu thực tế.',
    category: 'Phát triển Web',
    instructor: 'LUMER Academy',
    progress: 0,
    modules: [
      {
        id: 'next-m1',
        title: 'Mô-đun 1: Cấu trúc App Router và Routing cơ bản',
        lessons: [
          { id: 'next-l1', title: 'Khởi tạo dự án Next.js 14/15', duration: '15 phút' }
        ]
      }
    ]
  },
  {
    id: 'python-ai',
    title: 'Nhập môn Trí tuệ Nhân tạo & Học máy với Python',
    description: 'Học cách sử dụng thư viện NumPy, Pandas, Scikit-Learn để phân tích dữ liệu và huấn luyện các mô hình AI cơ bản.',
    category: 'Khoa học Dữ liệu & AI',
    instructor: 'Stanford Online',
    progress: 0,
    modules: [
      {
        id: 'py-m1',
        title: 'Mô-đun 1: Phân tích dữ liệu với bộ thư viện cơ bản',
        lessons: [
          { id: 'py-l1', title: 'Xử lý ma trận bằng NumPy', duration: '18 phút' }
        ]
      }
    ]
  },
  {
    id: 'ui-ux-design',
    title: 'Thiết kế giao diện người dùng (UI/UX) bằng Figma',
    description: 'Làm chủ tư duy thiết kế, xây dựng Wireframe, Prototype và tạo dựng hệ thống Design System chuyên nghiệp.',
    category: 'Thiết kế Đồ họa',
    instructor: 'Google Career Certificates',
    progress: 0,
    modules: [
      {
        id: 'ui-m1',
        title: 'Mô-đun 1: Tư duy thiết kế lấy người dùng làm trung tâm',
        lessons: [
          { id: 'ui-l1', title: 'Phân biệt UI và UX trong dự án công nghệ', duration: '10 phút' }
        ]
      }
    ]
  },
  // ==================== CÁC KHÓA HỌC ĐƯỢC BỔ SUNG THÊM ====================
  {
    id: 'ceh-v12-hacker',
    title: 'Hacker Mũ Trắng CEH v12 Thực Chiến',
    description: 'Thực hành thâm nhập hệ thống, quét lỗ hổng mạng, và tìm hiểu phương thức phòng chống mã độc tống tiền (Ransomware).',
    category: 'An ninh mạng',
    instructor: 'EC-Council Partner',
    progress: 0,
    modules: [
      {
        id: 'ceh-m1',
        title: 'Mô-đun 1: Kỹ thuật quét mạng và rà quét cổng',
        lessons: [
          { id: 'ceh-l1', title: 'Làm chủ công cụ Nmap thu thập thông tin', duration: '25 phút' }
        ]
      }
    ]
  },
  {
    id: 'comptia-sec-plus',
    title: 'Luyện thi chứng chỉ quốc tế CompTIA Security+',
    description: 'Cung cấp kiến thức nền tảng vững chắc về mật mã học, quản lý định danh IAM, cấu trúc tường lửa và an ninh hạ tầng mạng.',
    category: 'An ninh mạng',
    instructor: 'CompTIA Authorized',
    progress: 0,
    modules: [
      {
        id: 'comp-m1',
        title: 'Mô-đun 1: Cơ chế mã hóa và giao thức bảo mật',
        lessons: [
          { id: 'comp-l1', title: 'Phân biệt mã hóa đối xứng AES và RSA', duration: '15 phút' }
        ]
      }
    ]
  },
  {
    id: 'react-native-app',
    title: 'Lập trình ứng dụng di động Hybrid với React Native',
    description: 'Phát triển ứng dụng iOS và Android đa nền tảng từ một mã nguồn duy nhất. Tích hợp bản đồ, định vị GPS và lưu kho dữ liệu.',
    category: 'Phát triển Web',
    instructor: 'Meta Developers',
    progress: 0,
    modules: [
      {
        id: 'rn-m1',
        title: 'Mô-đun 1: Quản lý luồng giao diện di động',
        lessons: [
          { id: 'rn-l1', title: 'Thiết lập Stack và Tab Navigation', duration: '22 phút' }
        ]
      }
    ]
  },
  {
    id: 'nodejs-backend-api',
    title: 'Xây dựng Backend RESTful API với Node.js & Express',
    category: 'Phát triển Web',
    instructor: 'LUMER Academy',
    description: 'Thiết kế kiến trúc máy chủ backend có khả năng mở rộng tốt, kết nối cơ sở dữ liệu MongoDB, mã hóa mật khẩu mật bảo mật.',
    modules: [
      {
        id: 'node-m1',
        title: 'Mô-đun 1: Cơ chế Middleware và Định tuyến Routing',
        lessons: [
          { id: 'node-l1', title: 'Tạo và phân quyền API kiểm định JWT', duration: '30 phút' }
        ]
      }
    ]
  },
  {
    id: 'deep-learning-ai',
    title: 'Deep Learning: Học sâu và mạng Nơ-ron nhân tạo',
    description: 'Đi sâu vào xây dựng kiến trúc mạng nơ-ron (CNN, RNN), xử lý ảnh số máy tính và nhận diện ngôn ngữ tự nhiên thông minh.',
    category: 'Khoa học Dữ liệu & AI',
    instructor: 'DeepLearning.AI',
    progress: 0,
    modules: [
      {
        id: 'dl-m1',
        title: 'Mô-đun 1: Khởi tạo mạng nơ-ron đa lớp',
        lessons: [
          { id: 'dl-l1', title: 'Cơ chế kích hoạt hàm ReLU và Softmax', duration: '28 phút' }
        ]
      }
    ]
  },
  {
    id: 'power-bi-dashboard',
    title: 'Trực quan hóa và phân tích dữ liệu bằng Power BI',
    description: 'Học cách kết nối các kho dữ liệu hỗn hợp, viết biểu thức tính toán DAX nâng cao và xây dựng biểu đồ quản trị báo cáo doanh nghiệp.',
    category: 'Khoa học Dữ liệu & AI',
    instructor: 'Microsoft Certified Lab',
    progress: 0,
    modules: [
      {
        id: 'pbi-m1',
        title: 'Mô-đun 1: Chuẩn hóa mô hình dữ liệu quan hệ',
        lessons: [
          { id: 'pbi-l1', title: 'Sử dụng hàm CALCULATE giải bài toán lọc dữ liệu', duration: '20 phút' }
        ]
      }
    ]
  }
];