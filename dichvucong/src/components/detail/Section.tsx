export default function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-3 lg:py-4">
      <h4 className="mb-3 text-base font-bold text-brand-dark lg:text-lg">{title}</h4>
      {children}
    </section>
  );
}

export function SectionText({ text }: { text: string }) {
  if (!text || text === "Không có thông tin") {
    return <div className="text-muted/80">Không có thông tin</div>;
  }
  return <p className="whitespace-pre-wrap text-base">{text}</p>;
}
