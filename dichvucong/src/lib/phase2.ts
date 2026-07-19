"use client";

// Deviation chủ ý (CLONE_SPEC.md mục 6): toggle "Phase 2 preview" — bật/tắt
// markup web component của trợ lý OpenGOV trên trang tờ khai. Đọc localStorage
// sau mount (SSR/client khớp nhau — cùng pattern AuthProvider); các component
// nghe chung một event để đồng bộ không cần context.

import { useEffect, useState } from "react";

const KEY = "dvc-phase2";
const EVENT = "dvc-phase2-change";

export function usePhase2(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => setOn(localStorage.getItem(KEY) === "1");
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  return on;
}

export function setPhase2(v: boolean): void {
  localStorage.setItem(KEY, v ? "1" : "0");
  window.dispatchEvent(new Event(EVENT));
}
