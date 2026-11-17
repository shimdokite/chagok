import { useState } from "react";
import { currentMonth } from "@chagok/contracts/benefits";
import { won } from "@chagok/contracts/demo";
import { useSession } from "../src/auth/SessionProvider";
import { usePolicy } from "../src/benefits/queries";
import {
  BenefitScreen,
  Message,
  MonthControl,
  QueryFeedback,
} from "../src/benefits/screen";
import { BenefitCategoryList } from "../src/components/BenefitCategoryList";

export default function Policy() {
  const { state } = useSession();
  const [month, setMonth] = useState(() =>
    state.status === "demo" ? "2026-11" : currentMonth(),
  );
  const query = usePolicy(month);
  const policy = query.data?.policy;
  return (
    <BenefitScreen title="복지 안내" company={query.data?.company?.name}>
      <MonthControl month={month} onChange={setMonth} />
      <QueryFeedback
        pending={query.isPending}
        error={query.isError}
        fetching={query.isFetching}
        retry={() => void query.refetch()}
      />
      {query.data && !query.data.company ? (
        <Message>회사에 연결된 후 정책을 확인할 수 있어요.</Message>
      ) : null}
      {query.data?.company && !policy ? (
        <Message>이 달의 복지 정책이 아직 등록되지 않았어요.</Message>
      ) : null}
      {policy ? (
        <>
          <Message>월 복지 한도 {won(policy.allowance)}원</Message>
          <BenefitCategoryList categories={policy.categories} />
          <Message>{policy.guidance}</Message>
          <Message>
            사용일 기준 월별로 계산해요. 검토 중과 승인 완료 금액을 한 번만
            차감하며, 반려된 신청은 차감하지 않아요.
          </Message>
        </>
      ) : null}
    </BenefitScreen>
  );
}
