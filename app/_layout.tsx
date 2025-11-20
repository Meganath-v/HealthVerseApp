import { Stack } from "expo-router";
import './global.css';
export default function RootLayout() {
  return <Stack
      screenOptions={{
        headerShown: false, // 🔕 Hide top header on all screens
      }}
    />;
}
