import { BridgeReceiver } from "../../components/bridge/BridgeReceiver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoBalance, won } from "@chagok/contracts/demo";

const group = "grid min-w-0 gap-[10px]";

export default function Apply() {
  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-[23px] pb-[30px] max-[340px]:px-[18px] max-[340px]:pb-6">
      <header className="flex min-h-[76px] items-center justify-between gap-3">
        <strong className="text-[17px] font-semibold">복지비 신청</strong>
        <span className="text-xs text-muted-foreground">▥ 신청 예시</span>
      </header>
      <BridgeReceiver />
      <section className="my-[30px]">
        <h1 className="mb-3 text-[25px] leading-[1.45] font-semibold tracking-[-0.7px] max-[340px]:text-[23px]">
          어떤 복지를 사용했나요?
        </h1>
        <p className="my-[14px] leading-[1.7] text-muted-foreground">
          사용 내역과 영수증을 함께 알려주세요.
        </p>
      </section>
      <form>
        <fieldset disabled className="m-0 grid min-w-0 gap-[23px] border-0 p-0">
          <div className={group}>
            <Label htmlFor="benefit">복지 항목</Label>
            <select
              id="benefit"
              disabled
              defaultValue="식비"
              className="min-h-12 w-full min-w-0 max-w-full rounded-[13px] border border-input bg-card p-[14px] text-[13px] font-medium text-foreground opacity-100 disabled:cursor-not-allowed"
            >
              <option>식비</option>
              <option>도서비</option>
              <option>운동비</option>
            </select>
          </div>
          <div className={group}>
            <Label htmlFor="used-date">사용일</Label>
            <Input
              id="used-date"
              type="date"
              disabled
              defaultValue="2026-11-13"
            />
          </div>
          <div className={group}>
            <Label htmlFor="amount">신청 금액</Label>
            <div className="relative">
              <Input
                id="amount"
                inputMode="numeric"
                disabled
                placeholder="0"
                className="pr-[45px]"
                aria-describedby="amount-hint"
              />
              <span className="absolute top-[15px] right-4 text-[13px] font-medium">
                원
              </span>
            </div>
            <small
              id="amount-hint"
              className="text-xs leading-normal font-normal text-muted-foreground"
            >
              샘플 한도 {won(demoBalance.available)}원 · 실제 계정 잔액은 홈에서 확인하세요.
            </small>
          </div>
          <div className={group}>
            <Label htmlFor="description">사용 내용</Label>
            <Input
              id="description"
              disabled
              placeholder="사용 내용을 입력해 주세요"
            />
          </div>
          <div className={group}>
            <Label htmlFor="receipt">영수증</Label>
            <Button
              id="receipt"
              type="button"
              disabled
              variant="outline"
              className="min-h-[70px] w-full text-muted-foreground disabled:opacity-100"
            >
              ◎　영수증 촬영·선택 · 준비 중
            </Button>
          </div>
          <Button
            type="button"
            disabled
            className="mt-[10px] w-full font-semibold disabled:opacity-[0.55]"
          >
            복지비 신청하기 · 준비 중
          </Button>
        </fieldset>
      </form>
      <p className="mt-5 text-center text-[11px] leading-[1.7] text-muted-foreground">
        데모 화면이에요. 입력·첨부·제출은 아직 사용할 수 없어요.
      </p>
    </main>
  );
}
