import { BenefitsProvider } from "../src/benefits/BenefitsProvider";
import { Text, View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "../src/auth/SessionProvider";
import { useTheme } from "../src/theme/tokens";
import { canAccessApp } from "../src/auth/session";

export default function Layout() {
  return (
    <SessionProvider>
      <BenefitsProvider>
        <Navigation />
      </BenefitsProvider>
    </SessionProvider>
  );
}

function Navigation() {
  const c = useTheme();
  const { state } = useSession();
  const allowed = canAccessApp(state);
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.background },
          }}
        >
          <Stack.Protected guard={!allowed}>
            <Stack.Screen name="index" />
          </Stack.Protected>
          <Stack.Protected guard={allowed}>
            <Stack.Screen name="home" />
            <Stack.Screen name="apply" />
            <Stack.Screen name="history" />
            <Stack.Screen name="policy" />
            <Stack.Screen name="requests/[id]" />
          </Stack.Protected>
        </Stack>
        {state.status === "busy" ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: c.background,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
            accessibilityViewIsModal
          >
            <ActivityIndicator color={c.accent} />
            <Text style={{ color: c.secondary }}>
              로그인을 확인하고 있어요.
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}
