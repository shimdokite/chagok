import { useState } from "react";
import { ScrollView, View, Text } from "react-native";
import { useSession } from "../src/auth/SessionProvider";
import { SessionDiagnostics } from "../src/dev/SessionDiagnostics";
import { VisualCheckControls } from "../src/dev/VisualCheckControls";
import { useVisualCheckScroll } from "../src/dev/useVisualCheckScroll";
import { Page, Header, Button, styles } from "../src/components/ui";
import { BenefitBalanceCard } from "../src/components/BenefitBalanceCard";
import { BenefitCategoryList } from "../src/components/BenefitCategoryList";
import { RecentRequestList } from "../src/components/RecentRequestList";
import { ServerDiagnostics } from "../src/dev/ServerDiagnostics";
import { useTheme } from "../src/theme/tokens";
import { currentMonth } from "@chagok/contracts/benefits";
import { useHome } from "../src/benefits/queries";
import {
  BenefitNavigation,
  Message,
  MonthControl,
  QueryFeedback,
} from "../src/benefits/screen";

export default function Home() {
  const c = useTheme();
  const { state, controller } = useSession();
  const visual = useVisualCheckScroll();
  const [month, setMonth] = useState(() =>
    state.status === "demo" ? "2026-11" : currentMonth(),
  );
  const query = useHome(month);
  const data = query.data;
  const company = data && data.kind !== "unassigned" ? data.company : undefined;
  const isDemo = state.status === "demo";
  return (
    <Page>
      <Header company={company?.name} />
      <ScrollView
        ref={visual.ref}
        onLayout={visual.onLayout}
        onScroll={visual.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
      >
        <View style={{ gap: 12 }}>
          <Text style={{ color: c.secondary, fontSize: 14 }}>
            {isDemo ? "도연님, 안녕하세요." : "안녕하세요."}
          </Text>
          <Text
            style={{
              color: c.text,
              fontSize: 26,
              lineHeight: 36,
              fontWeight: "600",
            }}
          >
            나를 위한 복지,{"\n"}차곡차곡 누려요.
          </Text>
          {isDemo ? <Message>익명 데모 · 가상 데이터</Message> : null}
          {!isDemo && company?.isSample ? (
            <Message>개발용 샘플 회사 · DB 조회 데이터</Message>
          ) : null}
        </View>
        <MonthControl month={month} onChange={setMonth} />
        <QueryFeedback
          pending={query.isPending}
          error={query.isError}
          fetching={query.isFetching}
          retry={() => void query.refetch()}
        />
        {data?.kind === "unassigned" ? (
          <Message>
            아직 회사에 연결되지 않았어요. 회사 담당자에게 소속 등록을 요청해
            주세요.
          </Message>
        ) : null}
        {data?.kind === "noPolicy" ? (
          <Message>
            이 달의 복지 정책이 아직 등록되지 않았어요. 다른 달을 확인하거나
            담당자에게 문의해 주세요.
          </Message>
        ) : null}
        {data?.kind === "ready" ? (
          <>
            <BenefitBalanceCard amounts={data.amounts} month={month} />
            <BenefitCategoryList categories={data.policy.categories} />
            <RecentRequestList items={data.recent} />
          </>
        ) : null}
        <Button
          secondary
          title={isDemo ? "데모 나가기" : "로그아웃"}
          onPress={() => {
            if (isDemo) controller.leaveDemo();
            else void controller.signOut();
          }}
        />
        {__DEV__ ? (
          <>
            <ServerDiagnostics />
            <SessionDiagnostics />
          </>
        ) : null}
      </ScrollView>
      <BenefitNavigation />
      <VisualCheckControls move={visual.move} />
    </Page>
  );
}
