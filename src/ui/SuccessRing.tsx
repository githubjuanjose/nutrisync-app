import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Path, Defs, RadialGradient, Stop, G, ClipPath } from 'react-native-svg';

/**
 * R6-f6: "Logged & Syncing" hero — Design's `success-glowing-ring.svg`
 * (glowing Nutri orb in a white ring with the wings badge). The Figma drop
 * shadow filter and plus-darker blend aren't supported by react-native-svg,
 * so the badge shadow comes from the parent card instead — visually 1:1.
 */
export function SuccessRing({ size = 106 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size * (108 / 106) }}>
      <Svg width={size} height={size * (108 / 106)} viewBox="0 0 106 108">
        <Defs>
          <RadialGradient id="succOrb" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
            gradientTransform="translate(50.5 52) rotate(90) scale(50 50.5)">
            <Stop offset="0.110577" stopColor="#FF0095" />
            <Stop offset="0.9999" stopColor="#FF560A" />
            <Stop offset="1" stopColor="#FFDBCB" />
          </RadialGradient>
          <ClipPath id="succMouth"><Rect width={6} height={3} x={38} y={37} /></ClipPath>
        </Defs>
        <Rect x={1.5} y={0.5} width={99} height={99} rx={49.5} fill="white" />
        <Rect x={1.5} y={0.5} width={99} height={99} rx={49.5} stroke="#F6F6F6" />
        <Rect x={15} y={14} width={72} height={72} rx={36} fill="white" />
        <Rect opacity={0.85} y={2} width={101} height={100} rx={50} fill="url(#succOrb)" />
        {/* closed happy eyes */}
        <Path d="M34 35.8175C34 38.4781 33.2164 35.8175 29.5 35.8175C25.7836 35.8175 25 38.4781 25 35.8175C25 33.1569 27.0147 31 29.5 31C31.9853 31 34 33.1569 34 35.8175Z" fill="black" fillOpacity={0.82} />
        <Path d="M59 36C59 38.7614 58.5 36 54.5 36C50.5 36 50 38.7614 50 36C50 33.2386 52.0147 31 54.5 31C56.9853 31 59 33.2386 59 36Z" fill="black" fillOpacity={0.82} />
        <G clipPath="url(#succMouth)">
          <Path d="M39.0001 38.5001C39.0001 38.5001 40.0001 39.0001 41 39.0001C42.1916 39 43.0001 38.5001 43.0001 38.5001" stroke="black" strokeOpacity={0.82} strokeWidth={2} strokeLinecap="round" />
        </G>
        {/* white wings badge */}
        <Rect x={54} y={52} width={44} height={44} rx={22} fill="white" fillOpacity={0.9} />
        <Path d="M72.8144 77.8199C72.0186 81.4637 75.6141 85.9286 75.6141 85.9286C75.6141 85.9286 69.8339 81.3009 70.6779 77.4138C71.6076 73.1317 77.7072 71.7659 77.7072 71.7659C77.7072 71.7659 73.6851 73.8331 72.8144 77.8199Z" fill="#FF6F00" stroke="#FF6F00" strokeWidth={0.3} />
        <Path d="M70.6217 75.5968C72.0779 73.3632 76.3601 71.2246 76.3601 71.2246C76.3601 71.2246 70.2211 72.9708 68.9944 75.8267C68.1861 77.7085 69.209 80.504 69.209 80.504C69.209 80.504 69.4583 77.3813 70.6217 75.5968Z" fill="#FF6F00" stroke="#FF6F00" strokeWidth={0.3} />
        <Path d="M67.361 76.5487C69.9112 72.637 75.5536 70.7245 75.5536 70.7245C75.5536 70.7245 66.978 73.5643 65.4659 76.5299C63.9861 79.4321 65.9246 83.4242 65.9246 83.4242C65.9246 83.4242 65.4483 79.4825 67.361 76.5487Z" fill="#FF6F00" stroke="#FF6F00" strokeWidth={0.3} />
        <Path d="M66.5754 74.3263C68.9849 72.1839 74.7444 70.4704 74.7444 70.4704C74.7444 70.4704 70.3751 71.3364 67.2488 72.8261C64.1005 74.3263 64.1005 77.5006 64.1005 77.5006C64.1005 77.5006 64.386 76.2731 66.5754 74.3263Z" fill="#FF6F00" stroke="#FF6F00" strokeWidth={0.3} />
        <Path d="M79.1914 70.1773C79.9847 66.5331 76.3862 62.0703 76.3862 62.0703C76.3862 62.0703 82.1695 66.6947 81.3282 70.5822C80.4014 74.8649 74.3028 76.2341 74.3028 76.2341C74.3028 76.2341 78.3234 74.1646 79.1914 70.1773Z" fill="#FF6F00" stroke="#FF6F00" strokeWidth={0.3} />
        <Path d="M81.3856 72.3993C79.9309 74.6337 75.6502 76.7747 75.6502 76.7747C75.6502 76.7747 81.788 75.0251 83.0127 72.1685C83.8197 70.2862 82.795 67.4913 82.795 67.4913C82.795 67.4913 82.5478 70.6141 81.3856 72.3993Z" fill="#FF6F00" stroke="#FF6F00" strokeWidth={0.3} />
        <Path d="M84.6455 71.4456C82.0979 75.3587 76.4569 77.2744 76.4569 77.2744C76.4569 77.2744 85.0305 74.4298 86.5406 71.4633C88.0184 68.5603 86.0772 64.5692 86.0772 64.5692C86.0772 64.5692 86.5562 68.5107 84.6455 71.4456Z" fill="#FF6F00" stroke="#FF6F00" strokeWidth={0.3} />
        <Path d="M85.4324 73.6675C83.0244 75.8113 77.2661 77.5281 77.2661 77.5281C77.2661 77.5281 81.6348 76.6596 84.7601 75.1681C87.9074 73.6661 87.9052 70.4919 87.9052 70.4919C87.9052 70.4919 87.6205 71.7195 85.4324 73.6675Z" fill="#FF6F00" stroke="#FF6F00" strokeWidth={0.3} />
      </Svg>
    </View>
  );
}

/** R6-f6: green "done" tick from Design's `dot-active.svg`. */
export function DotActive({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Rect width={16} height={16} rx={8} fill="#E0F7E5" />
      <Path d="M11.333 5.5L6.75012 10.083L4.667 7.99982" stroke="#10B981" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
