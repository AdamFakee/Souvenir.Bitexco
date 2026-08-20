import React from 'react'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

interface EmptyBoxSvgProps {
  width?: number
  height?: number
}

/**
 * Beautiful vector illustration for Empty State (Open box with magnifying glass 'X')
 */
export const EmptyBoxSvg = ({ width = 200, height = 150 }: EmptyBoxSvgProps) => {
  return (
    <Svg width={width} height={height} viewBox="0 15 320 205" fill="none">
      {/* Soft Pastel Brand Backdrop */}
      <Path
        d="M50 120C40 70 80 25 145 25C220 25 275 45 285 105C295 165 245 215 160 215C85 215 60 170 50 120Z"
        fill="#ECF1F4"
      />

      {/* Sunburst Rays above box */}
      <Path d="M85 45L100 65" stroke="#7596A8" strokeWidth="3.5" strokeLinecap="round" />
      <Path d="M128 35L128 58" stroke="#7596A8" strokeWidth="3.5" strokeLinecap="round" />
      <Path d="M172 45L158 65" stroke="#7596A8" strokeWidth="3.5" strokeLinecap="round" />

      {/* Dashed Flight Path */}
      <Path
        d="M52 75C42 105 70 115 110 105C145 95 140 68 70 78"
        stroke="#496C7E"
        strokeWidth="2.5"
        strokeDasharray="4 4"
        strokeLinecap="round"
      />

      {/* Bee / Bug Icon at end of flight path */}
      <G transform="translate(68, 26) rotate(-25)">
        <Path
          d="M10 5C10 7.76 7.76 10 5 10C2.24 10 0 7.76 0 5C0 2.24 2.24 0 5 0C7.76 0 10 2.24 10 5Z"
          fill="#496C7E"
        />
        <Path d="M2 1C-2 -4 -4 -2 -1 1" stroke="#496C7E" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M8 1C12 -4 14 -2 11 1" stroke="#496C7E" strokeWidth="2.5" strokeLinecap="round" />
      </G>

      {/* Cardboard Box - Left Flap Open */}
      <Path
        d="M42 92L92 92L125 118L22 118Z"
        fill="#A5C0CF"
        stroke="#385261"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Cardboard Box - Right Flap Open */}
      <Path
        d="M125 118L228 118L245 92L145 92Z"
        fill="#7596A8"
        stroke="#385261"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Box Main Body - Left Face */}
      <Path
        d="M42 118H125V202H42V118Z"
        fill="#A5C0CF"
        stroke="#385261"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Box Main Body - Right Face */}
      <Path
        d="M125 118H228V202H125V118Z"
        fill="#537B90"
        stroke="#385261"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Sticker / Label on Left Face */}
      <Rect
        x="54"
        y="152"
        width="38"
        height="36"
        rx="5"
        fill="#FFFFFF"
        stroke="#385261"
        strokeWidth="2.5"
      />
      <Path d="M61 162H85" stroke="#385261" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M61 169H85" stroke="#385261" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M61 176H77" stroke="#385261" strokeWidth="2.5" strokeLinecap="round" />

      {/* Magnifying Glass Lens */}
      <Circle
        cx="175"
        cy="132"
        r="45"
        fill="#DBE6EB"
        fillOpacity="0.9"
        stroke="#385261"
        strokeWidth="5.5"
      />
      <Circle cx="175" cy="132" r="39" stroke="#7596A8" strokeWidth="2" />

      {/* 'X' Symbol inside Lens */}
      <Path d="M158 115L192 149" stroke="#385261" strokeWidth="7" strokeLinecap="round" />
      <Path d="M192 115L158 149" stroke="#385261" strokeWidth="7" strokeLinecap="round" />

      {/* Magnifying Glass Handle */}
      <Path d="M206 163L247 212" stroke="#385261" strokeWidth="20" strokeLinecap="round" />
      <Path d="M206 163L247 212" stroke="#537B90" strokeWidth="13" strokeLinecap="round" />
      <Path
        d="M209 166L244 209"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
    </Svg>
  )
}
