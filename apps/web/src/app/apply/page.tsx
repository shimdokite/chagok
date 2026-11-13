import { BridgeReceiver } from "../../components/bridge/BridgeReceiver";
import { demoBalance, won } from "@chagok/contracts/demo";
export default function Apply() {
  return (
    <main>
      <header>
        <strong>복지비 신청</strong>
        <span>▥ 그로브</span>
      </header>
      <BridgeReceiver />
      <section className="intro">
        <h1>어떤 복지를 사용했나요?</h1>
        <p>사용 내역과 영수증을 함께 알려주세요.</p>
      </section>
      <form>
        <fieldset disabled>
          <label>
            복지 항목
            <select defaultValue="식비">
              <option>식비</option>
              <option>도서비</option>
              <option>운동비</option>
            </select>
          </label>
          <label>
            사용일
            <input type="date" defaultValue="2026-11-13" />
          </label>
          <label>
            신청 금액
            <div className="amount">
              <input inputMode="numeric" placeholder="0" />
              <span>원</span>
            </div>
            <small>
              현재 {won(demoBalance.available)}원까지 신청할 수 있어요.
            </small>
          </label>
          <label>
            사용 내용
            <input placeholder="사용 내용을 입력해 주세요" />
          </label>
          <label>
            영수증
            <button type="button" className="receipt">
              ◎　영수증 촬영·선택 · 준비 중
            </button>
          </label>
          <button className="primary" type="button">
            복지비 신청하기 · 준비 중
          </button>
        </fieldset>
      </form>
      <p className="footnote">
        데모 화면이에요. 입력·첨부·제출은 아직 사용할 수 없어요.
      </p>
    </main>
  );
}
