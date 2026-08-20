import React from 'react'
import Svg, { Circle, G, Path } from 'react-native-svg'

interface EmptyCartSvgProps {
  width?: number
  height?: number
}

/**
 * Vector illustration for Empty Cart State (Shopping Cart with dashed flight loop)
 */
export const EmptyCartSvg = ({ width = 180, height = 140 }: EmptyCartSvgProps) => {
  return (
    <Svg width={width} height={height} viewBox="0 15 300 205" fill="none">
      {/* Soft Pastel Brand Backdrop */}
      <Path
        d="M50 115C35 65 85 25 155 25C225 25 270 70 265 125C260 180 205 215 135 215C65 215 65 165 50 115Z"
        fill="#ECF1F4"
      />

      {/* Sunburst Rays */}
      <Path d="M85 45L100 65" stroke="#7596A8" strokeWidth="3.5" strokeLinecap="round" />
      <Path d="M128 35L128 58" stroke="#7596A8" strokeWidth="3.5" strokeLinecap="round" />
      <Path d="M172 45L158 65" stroke="#7596A8" strokeWidth="3.5" strokeLinecap="round" />

      {/* Dashed Flight Path Loop */}
      <Path
        d="M48 95C32 60 72 45 92 85C112 125 52 150 82 190C112 230 232 215 252 145C272 75 202 70 152 85"
        stroke="#496C7E"
        strokeWidth="2.5"
        strokeDasharray="4 4"
        strokeLinecap="round"
      />

      {/* Bee / Bug Icon */}
      <G transform="translate(52, 38) rotate(-30)">
        <Path
          d="M10 5C10 7.76 7.76 10 5 10C2.24 10 0 7.76 0 5C0 2.24 2.24 0 5 0C7.76 0 10 2.24 10 5Z"
          fill="#496C7E"
        />
        <Path d="M2 1C-2 -4 -4 -2 -1 1" stroke="#496C7E" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M8 1C12 -4 14 -2 11 1" stroke="#496C7E" strokeWidth="2.5" strokeLinecap="round" />
      </G>

      {/* Shopping Cart Structure */}
      {/* Cart Chassis Line & Handle */}
      <Path
        d="M62 90H88L106 170H214L238 95"
        stroke="#385261"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M50 90H68" stroke="#537B90" strokeWidth="9" strokeLinecap="round" />

      {/* Cart Main Basket Body */}
      <Path
        d="M82 95H238L218 165H102L82 95Z"
        fill="#A5C0CF"
        fillOpacity="0.45"
        stroke="#385261"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Grid Lines inside Cart Basket */}
      <Path d="M120 95V165" stroke="#385261" strokeWidth="2" strokeOpacity="0.4" />
      <Path d="M160 95V165" stroke="#385261" strokeWidth="2" strokeOpacity="0.4" />
      <Path d="M200 95V165" stroke="#385261" strokeWidth="2" strokeOpacity="0.4" />
      <Path d="M90 130H228" stroke="#385261" strokeWidth="2" strokeOpacity="0.4" />

      {/* Cart Front Panel Accent */}
      <Path d="M102 165L82 95H102L120 165H102Z" fill="#537B90" stroke="#385261" strokeWidth="2" />

      {/* Cart Wheels */}
      <Circle cx="120" cy="190" r="14" fill="#537B90" stroke="#385261" strokeWidth="4.5" />
      <Circle cx="120" cy="190" r="5" fill="#FFFFFF" />

      <Circle cx="198" cy="190" r="14" fill="#537B90" stroke="#385261" strokeWidth="4.5" />
      <Circle cx="198" cy="190" r="5" fill="#FFFFFF" />
    </Svg>
  )
}
