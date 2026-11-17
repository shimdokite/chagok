import type { ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Page, Header, Button, styles } from "../components/ui";
import { useTheme } from "../theme/tokens";
import { useSession } from "../auth/SessionProvider";
import { monthSchema, shiftMonth } from "@chagok/contracts/benefits";

export function BenefitScreen({
  title,
  company,
  children,
}: {
  title: string;
  company?: string;
  children: ReactNode;
}) {
  const c = useTheme();
  const { state } = useSession();
  return (
    <Page>
      <Header company={company} />
      <ScrollView contentContainerStyle={styles.content}>
        <Button
          secondary
          title="홈으로"
          onPress={() => router.replace("/home")}
        />
        <Text
          accessibilityRole="header"
          style={{ color: c.text, fontSize: 25, fontWeight: "600" }}
        >
          {title}
        </Text>
        {state.status === "demo" ? (
          <Message>익명 데모 · 가상 데이터</Message>
        ) : null}
        {children}
      </ScrollView>
      <BenefitNavigation />
    </Page>
  );
}

export function Message({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={{ color: c.secondary, fontSize: 14, lineHeight: 23 }}
    >
      {children}
    </Text>
  );
}

export function QueryFeedback({
  pending,
  error,
  fetching,
  retry,
}: {
  pending: boolean;
  error: boolean;
  fetching: boolean;
  retry: () => void;
}) {
  if (pending && !error)
    return <ActivityIndicator accessibilityLabel="불러오는 중" />;
  if (error)
    return (
      <View style={{ gap: 10 }}>
        <Message>
          정보를 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요. 이전
          정보가 보이면 최신 상태가 아닐 수 있어요.
        </Message>
        <Button title="다시 시도" onPress={retry} disabled={fetching} />
      </View>
    );
  return (
    <Button
      secondary
      title={fetching ? "새로고침 중" : "새로고침"}
      disabled={fetching}
      onPress={retry}
    />
  );
}

export function MonthControl({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  const c = useTheme();
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: c.text, fontSize: 18, fontWeight: "600" }}>
        {month.replace("-", "년 ")}월
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          secondary
          title="이전 달"
          disabled={!monthSchema.safeParse(previous).success}
          onPress={() => onChange(previous)}
          style={{ flex: 1 }}
        />
        <Button
          secondary
          title="다음 달"
          disabled={!monthSchema.safeParse(next).success}
          onPress={() => onChange(next)}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

export function BenefitNavigation() {
  const c = useTheme();
  return (
    <View
      style={{
        padding: 10,
        gap: 8,
        flexDirection: "row",
        borderTopWidth: 1,
        borderColor: c.line,
      }}
    >
      <Button
        secondary
        title="홈"
        onPress={() => router.replace("/home")}
        style={{ flex: 1 }}
      />
      <Button
        secondary
        title="신청 내역"
        onPress={() => router.push("/history")}
        style={{ flex: 1 }}
      />
      <Button
        secondary
        title="복지 안내"
        onPress={() => router.push("/policy")}
        style={{ flex: 1 }}
      />
    </View>
  );
}
