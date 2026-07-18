"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import LoginModal from "./LoginModal";

export type DemoUser = {
  hoTen: string;
  soDinhDanh: string;
  ngaySinh: string; // ISO yyyy-mm-dd
};

// Deviation chủ ý (CLONE_SPEC.md mục 6): đăng nhập giả với user cố định.
export const DEMO_USER: DemoUser = {
  hoTen: "Nguyễn Văn A",
  soDinhDanh: "001099012345",
  ngaySinh: "1999-01-01",
};

const STORAGE_KEY = "dvc-user";

type AuthState = {
  user: DemoUser | null;
  ready: boolean;
  modalOpen: boolean;
  login: () => void;
  logout: () => void;
  openModal: () => void;
  closeModal: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // user khởi tạo null cả server lẫn client — đọc localStorage sau mount để tránh lệch hydration
  const [user, setUser] = useState<DemoUser | null>(null);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // localStorage không khả dụng / JSON hỏng — coi như chưa đăng nhập
    }
    setReady(true);
  }, []);

  const login = useCallback(() => {
    setUser(DEMO_USER);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
    } catch {}
    setModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <AuthContext.Provider
      value={{ user, ready, modalOpen, login, logout, openModal, closeModal }}
    >
      {children}
      <LoginModal />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong AuthProvider");
  return ctx;
}
