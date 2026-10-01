import React from 'react'
import { View } from 'react-native'
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg'

interface TagBgProps {
  tagColor: string
  badgeColor: string
  IconComponent: any
}

export function MoneyBagIcon({ tagColor, badgeColor, IconComponent }: TagBgProps) {
  return (
    <View style={{ position: 'absolute', right: 24, bottom: 20, width: 88, height: 92 }}>
      <Svg width={88} height={92} viewBox="0 0 88 92" fill="none">
        <Defs>
          <SvgLinearGradient
            id="bagGrad"
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

        {/* --- GORGEOUS DRAWSTRING MONEY BAG SACK VECTOR --- */}
        {/* Ruffled Collar Top */}
        <Path
          d="M 18 28 C 14 28, 10 18, 10 10 C 10 7, 46 7, 46 10 C 46 18, 42 28, 38 28 Z"
          fill="url(#bagGrad)"
          stroke={tagColor}
          strokeWidth={1.5}
          strokeOpacity={0.25}
        />

        {/* Sack Body */}
        <Path
          d="M 18 28 C 10 33, 2 46, 2 64 C 2 82, 14 88, 28 88 C 42 88, 54 82, 54 64 C 54 46, 46 33, 38 28 Z"
          fill="url(#bagGrad)"
          stroke={tagColor}
          strokeWidth={1.5}
          strokeOpacity={0.25}
        />

        {/* Drawstring Wrap at the neck */}
        <Path
          d="M 16 28 C 24 31, 32 31, 40 28"
          stroke={tagColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeOpacity={0.4}
        />

        {/* Drawstring Knot & Tassels */}
        <Path
          d="M 28 29 C 24 36, 18 42, 20 50"
          stroke={tagColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeOpacity={0.4}
        />
        <Path
          d="M 28 29 C 32 36, 38 42, 36 50"
          stroke={tagColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeOpacity={0.4}
        />
      </Svg>

      {/* Overlapping Badge at bottom-right of money bag */}
      <View
        style={{ backgroundColor: badgeColor }}
        className="absolute bottom-0 right-0 h-12 w-12 items-center justify-center rounded-full border-2 border-white"
      >
        <IconComponent size={20} color="#ffffff" strokeWidth={3} />
      </View>
    </View>
  )
}
