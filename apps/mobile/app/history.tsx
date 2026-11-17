import { useState } from "react";
import { View } from "react-native";
import {
  currentMonth,
  statusLabels,
  type ClaimStatus,
} from "@chagok/contracts/benefits";
import { useSession } from "../src/auth/SessionProvider";
import { useHistory } from "../src/benefits/queries";
import {
  BenefitScreen,
  Message,
  MonthControl,
  QueryFeedback,
} from "../src/benefits/screen";
import { RecentRequestList } from "../src/components/RecentRequestList";
import { Button } from "../src/components/ui";

export default function History() {
  const { state } = useSession();
  const [month, setMonth] = useState(() =>
    state.status === "demo" ? "2026-11" : currentMonth(),
  );
  const [status, setStatus] = useState<ClaimStatus>();
  const query = useHistory({ month, status });
  const company = query.data?.pages[0]?.company;
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <BenefitScreen title="신청 내역" company={company?.name}>
      <MonthControl month={month} onChange={setMonth} />
      <View style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
        <Button
          title="전체"
          secondary={status !== undefined}
          onPress={() => setStatus(undefined)}
        />
        {(["SUBMITTED", "APPROVED", "REJECTED"] as const).map((value) => (
          <Button
            key={value}
            title={statusLabels[value]}
            secondary={status !== value}
            onPress={() => setStatus(value)}
          />
        ))}
      </View>
      <QueryFeedback
        pending={query.isPending}
        error={query.isError}
        fetching={query.isFetching}
        retry={() => void query.refetch()}
      />
      {query.data && !company ? (
        <Message>회사에 연결된 후 신청 내역을 확인할 수 있어요.</Message>
      ) : null}
      {company ? (
        <RecentRequestList items={items} title="선택한 달의 신청" />
      ) : null}
      {query.hasNextPage ? (
        <Button
          title={query.isFetchingNextPage ? "불러오는 중" : "더 보기"}
          disabled={query.isFetching}
          onPress={() => void query.fetchNextPage()}
        />
      ) : null}
    </BenefitScreen>
  );
}
