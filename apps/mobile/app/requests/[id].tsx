import { useLocalSearchParams, router } from "expo-router";
import { statusLabels } from "@chagok/contracts/benefits";
import { won } from "@chagok/contracts/demo";
import { useDetail } from "../../src/benefits/queries";
import {
  BenefitScreen,
  Message,
  QueryFeedback,
} from "../../src/benefits/screen";
import { Button } from "../../src/components/ui";

export default function RequestDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const query = useDetail(params.id ?? "");
  const claim = query.isError ? undefined : query.data?.claim;
  return (
    <BenefitScreen title="신청 상세" company={query.data?.company.name}>
      <Button
        secondary
        title="내역으로"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/history");
        }}
      />
      <QueryFeedback
        pending={query.isPending}
        error={query.isError}
        fetching={query.isFetching}
        retry={() => void query.refetch()}
      />
      {query.isError ? (
        <Message>본인 신청이 아니거나 삭제된 내역은 확인할 수 없어요.</Message>
      ) : null}
      {claim ? (
        <>
          <Message>{claim.title}</Message>
          <Message>
            {claim.category} · {won(claim.amount)}원
          </Message>
          <Message>사용일 {claim.usedOn}</Message>
          <Message>
            신청일{" "}
            {new Date(new Date(claim.submittedAt).getTime() + 9 * 3600000)
              .toISOString()
              .slice(0, 10)}{" "}
            (한국 시간)
          </Message>
          <Message>상태 · {statusLabels[claim.status]}</Message>
          {claim.status === "REJECTED" ? (
            <Message>
              반려 사유 · {claim.rejectionReason ?? "담당자에게 문의해 주세요."}
            </Message>
          ) : null}
          <Message>영수증 첨부·신청 수정은 준비 중이에요.</Message>
        </>
      ) : null}
    </BenefitScreen>
  );
}
