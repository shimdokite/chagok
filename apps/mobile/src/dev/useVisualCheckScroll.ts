import { useRef, type ComponentRef } from "react";
import { ScrollView } from "react-native";

export function useVisualCheckScroll() {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const viewport = useRef(300);
  const offset = useRef(0);
  return {
    ref,
    onLayout: (event: { nativeEvent: { layout: { height: number } } }) => {
      viewport.current = event.nativeEvent.layout.height;
    },
    onScroll: (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      offset.current = event.nativeEvent.contentOffset.y;
    },
    move: (direction: "top" | "next" | "end") => {
      if (!__DEV__ || process.env.EXPO_PUBLIC_VISUAL_CHECKS !== "1") return;
      if (direction === "end") ref.current?.scrollToEnd({ animated: false });
      else
        ref.current?.scrollTo({
          y: direction === "top" ? 0 : offset.current + viewport.current * 0.65,
          animated: false,
        });
    },
  };
}
