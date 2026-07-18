const STEPS = ["Thông tin chung", "Tờ khai", "Giấy tờ đính kèm", "Xem lại & Nộp"];

export default function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex items-start justify-between gap-1 md:gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "todo";
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span className="flex w-full items-center">
              <span
                className={`mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
                  state === "todo"
                    ? "border border-line bg-surface text-muted"
                    : "bg-brand text-white"
                }`}
                aria-current={state === "active" ? "step" : undefined}
              >
                {n}
              </span>
            </span>
            <span
              className={`text-xs md:text-sm ${
                state === "active" ? "font-bold text-brand" : "text-muted"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
