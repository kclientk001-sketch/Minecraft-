import type { Metadata } from "next";
import { PageHeading } from "@/components/ui/page-heading";
export const metadata: Metadata = { title: "Quyền riêng tư" };
export default function Privacy() {
  return (
    <>
      <PageHeading
        eyebrow="YOUR DATA"
        title="Quyền riêng tư"
        description="Thông tin minh bạch về dữ liệu mà website này lưu trữ."
      />
      <article className="container page-content privacy card prose-text">
        <h2>Dữ liệu được lưu</h2>
        <p>
          Form hỗ trợ lưu tên Minecraft, email, nội dung, liên kết bằng chứng và
          thời điểm gửi trong cơ sở dữ liệu để quản trị viên xử lý. Website
          không tự gửi email hoặc chuyển ticket cho Discord.
        </p>
        <h2>Cookie & bộ nhớ trình duyệt</h2>
        <p>
          Giỏ hàng xem thử lưu lựa chọn sản phẩm trong localStorage của trình
          duyệt. Đăng nhập quản trị sử dụng cookie phiên cần thiết, HttpOnly và
          SameSite Strict; cookie được bật Secure trong production. Website
          không cài công cụ quảng cáo hoặc phân tích hành vi.
        </p>
        <h2>Bảo vệ & xóa dữ liệu</h2>
        <p>
          Chỉ quản trị viên được phân quyền có thể đọc ticket. Bạn có thể yêu
          cầu xóa dữ liệu thông qua kênh hỗ trợ chính thức, cung cấp mã ticket
          để xác định nội dung cần xử lý. Quản trị viên có thể xóa ticket khỏi
          dashboard.
        </p>
        <h2>Liên kết bên ngoài</h2>
        <p>
          Khi mở Discord, trang vote hoặc cửa hàng bên ngoài, chính sách của
          dịch vụ đó được áp dụng. Giỏ hàng xem thử không tự động chuyển sang
          cửa hàng bên ngoài.
        </p>
        <h2>Thông tin trước khi phát hành</h2>
        <p>
          Đây là chính sách mẫu phản ánh chức năng của mã nguồn hiện tại. Chủ
          server cần công bố thông tin liên hệ, thời hạn lưu trữ và chính sách
          phù hợp trước khi đưa website vào sử dụng thật.
        </p>
      </article>
    </>
  );
}
