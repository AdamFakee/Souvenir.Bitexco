import React from 'react'
import { View } from 'react-native'
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg'

interface TagBgProps {
  tagColor: string
  badgeColor: string
  IconComponent: any
}

export function GiftBoxIcon({ tagColor, badgeColor, IconComponent }: TagBgProps) {
  return (
    <View style={{ position: 'absolute', right: 24, bottom: 20, width: 88, height: 92 }}>
      <Svg width={88} height={92} viewBox="0 0 88 92" fill="none">
        <Defs>
          <SvgLinearGradient
            id="boxGrad"
            x1="0"
            y1="0"
            x2="56"
            y2="92"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={tagColor} stopOpacity={0.12} />
            <Stop offset="1" stopColor={tagColor} stopOpacity={0.38} />
          </SvgLinearGradient>
        </Defs>

        {/* --- GORGEOUS SOUVENIR GIFT BOX VECTOR DRAWING --- */}
        {/* Left Loop Bow */}
        <Path
          d="M 28 24 C 14 10, 4 12, 12 24 C 18 30, 25 26, 28 24 Z"
          fill="url(#boxGrad)"
          stroke={tagColor}
          strokeWidth={1.5}
          strokeOpacity={0.25}
        />
        {/* Right Loop Bow */}
        <Path
          d="M 28 24 C 42 10, 52 12, 44 24 C 38 30, 31 26, 28 24 Z"
          fill="url(#boxGrad)"
          stroke={tagColor}
          strokeWidth={1.5}
          strokeOpacity={0.25}
        />

        {/* Gift Box Lid */}
        <Path
          d="M 2 26 A 2 2 0 0 1 4 24 H 52 A 2 2 0 0 1 54 26 V 34 A 2 2 0 0 1 52 36 H 4 A 2 2 0 0 1 2 36 Z"
          fill="url(#boxGrad)"
          stroke={tagColor}
          strokeWidth={1.5}
          strokeOpacity={0.25}
        />

        {/* Gift Box Body */}
        <Path
          d="M 6 38 H 50 A 4 4 0 0 1 54 42 V 84 A 4 4 0 0 1 50 88 H 6 A 4 4 0 0 1 2 84 V 42 A 4 4 0 0 1 6 38 Z"
          fill="url(#boxGrad)"
          stroke={tagColor}
          strokeWidth={1.5}
          strokeOpacity={0.25}
        />

        {/* Vertical Ribbon Stripe */}
        <Path d="M 25 24 V 88 H 31 V 24 Z" fill={tagColor} opacity={0.15} />

        {/* Horizontal Ribbon Stripe on Body */}
        <Path d="M 2 56 H 54 V 62 H 2 Z" fill={tagColor} opacity={0.15} />
      </Svg>

      {/* Overlapping Badge at bottom-right of gift box */}
      <View
        style={{ backgroundColor: badgeColor }}
        className="absolute bottom-0 right-0 h-12 w-12 items-center justify-center rounded-full border-2 border-white shadow-sm"
      >
        <IconComponent size={20} color="#ffffff" strokeWidth={3} />
      </View>
    </View>
  )
}
