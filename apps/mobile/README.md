# Mobile / TV App (Expo + React Native)

Expo SDK 52 + React Native 0.76,覆盖 iOS / Android / Android TV / tvOS。

## M5 脚手架待补

```bash
pnpm dlx create-expo-app@latest apps/mobile --template default
```

TV 端切换:
- 依赖替换为 `react-native-tvos`
- EAS `production_tv` profile 传入 `EXPO_TV=1`
- 组件三端变体后缀:`.mobile.tsx` / `.tablet.tsx` / `.tv.tsx`
