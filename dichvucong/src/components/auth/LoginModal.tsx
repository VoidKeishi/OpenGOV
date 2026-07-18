"use client";

import { X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { DEMO_USER } from "./AuthProvider";

export default function LoginModal() {
  const { modalOpen, closeModal, login } = useAuth();
  if (!modalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-md rounded-md bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 id="login-modal-title" className="text-lg font-bold text-brand-dark">
            Đăng nhập
          </h2>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Đóng"
            className="text-muted hover:text-brand"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="rounded bg-accent/20 px-3 py-2 text-sm text-ink">
            <strong>Môi trường demo</strong> — đăng nhập giả lập, không kết nối
            VNeID. Bấm &ldquo;Đăng nhập&rdquo; để tiếp tục với tài khoản minh hoạ.
          </p>
          <dl className="mt-4 space-y-2 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Họ và tên</dt>
              <dd className="font-semibold">{DEMO_USER.hoTen}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Số định danh cá nhân</dt>
              <dd className="font-semibold">{DEMO_USER.soDinhDanh}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Ngày sinh</dt>
              <dd className="font-semibold">01/01/1999</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={login}
            className="mt-5 w-full rounded bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
