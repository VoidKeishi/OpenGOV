import TrongDong from "@/components/icons/TrongDong";

export default function Footer() {
  return (
    <footer>
      <div className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1168px] gap-6 px-4 py-8 md:grid-cols-2 md:py-10">
          {["Câu hỏi thường gặp", "Hướng dẫn sử dụng"].map((label) => (
            <a
              key={label}
              href="#"
              className="flex items-center justify-center gap-5 text-lg text-ink hover:text-brand"
            >
              <TrongDong className="h-20 w-20 md:h-24 md:w-24" />
              {label}
            </a>
          ))}
        </div>
      </div>
      <div className="bg-brand-dark px-4 py-4 text-center text-[15px] text-white">
        Cơ quan chủ quản: Trung tâm dữ liệu quốc gia - Bộ Công an. Tổng đài hỗ
        trợ: 18001096
      </div>
    </footer>
  );
}
