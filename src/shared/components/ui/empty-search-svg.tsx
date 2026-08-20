import React from 'react'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

interface EmptySearchSvgProps {
  width?: number
  height?: number
}

/**
 * Vector illustration for Search Empty State (Magnifying glass with dashed flight loop)
 */
export const EmptySearchSvg = ({ width = 180, height = 140 }: EmptySearchSvgProps) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 300 240" fill="none">
      {/* Soft Pastel Brand Backdrop */}
      <Path
        d="M60 110C40 60 90 20 160 20C230 20 270 65 270 120C270 180 210 220 140 220C70 220 80 160 60 110Z"
        fill="#ECF1F4"
      />

      {/* Dashed Flight Path Loop */}
      <Path
        d="M45 105C25 65 65 40 85 80C105 120 45 145 75 185C105 225 225 210 245 140C265 70 195 65 145 80"
        stroke="#496C7E"
        strokeWidth="2.5"
        strokeDasharray="4 4"
        strokeLinecap="round"
      />

      {/* Bee / Bug Icon */}
      <G transform="translate(48, 42) rotate(-35)">
        <Path
          d="M10 5C10 7.76 7.76 10 5 10C2.24 10 0 7.76 0 5C0 2.24 2.24 0 5 0C7.76 0 10 2.24 10 5Z"
          fill="#496C7E"
        />
        <Path d="M2 1C-2 -4 -4 -2 -1 1" stroke="#496C7E" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M8 1C12 -4 14 -2 11 1" stroke="#496C7E" strokeWidth="2.5" strokeLinecap="round" />
      </G>

      {/* Magnifying Glass Main Outer Ring */}
      <Circle cx="128" cy="98" r="64" fill="#FFFFFF" stroke="#385261" strokeWidth="18" />
      <Circle cx="128" cy="98" r="55" fill="#FFFFFF" />

      {/* Glass Inner Reflection Arc */}
      <Path d="M84 102C82 80 96 62 118 58" stroke="#7596A8" strokeWidth="5" strokeLinecap="round" />

      {/* Magnifying Glass Connector Neck & Handle */}
      <G transform="translate(170, 140) rotate(42)">
        <Rect
          x="-12"
          y="0"
          width="24"
          height="22"
          rx="4"
          fill="#FFFFFF"
          stroke="#385261"
          strokeWidth="4"
        />
        <Rect
          x="-16"
          y="18"
          width="32"
          height="75"
          rx="16"
          fill="#537B90"
          stroke="#385261"
          strokeWidth="4"
        />
        <Path
          d="M-8 26V82"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.5"
        />
      </G>
    </Svg>
  )
}
