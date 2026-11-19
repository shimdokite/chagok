import { ApplyForm } from "../../components/apply/ApplyForm";

// The initial date must follow KST on each request, not the build date.
export const dynamic = "force-dynamic";

export default function Apply() {
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-[23px] pb-[30px] max-[340px]:px-[18px] max-[340px]:pb-6">
      <header className="flex min-h-[76px] items-center justify-between gap-3">
        <strong className="text-[17px] font-semibold">복지비 신청</strong>
      </header>
      <ApplyForm today={today} />
    </main>
  );
}
