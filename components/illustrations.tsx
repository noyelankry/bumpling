import Svg, { Circle, Path, Ellipse, G } from 'react-native-svg'
import { colors } from '../lib/theme'

export function BabyMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M20 4c7 0 12 6 12 14 0 9-6 18-12 18S8 27 8 18C8 10 13 4 20 4Z"
        fill={colors.peach}
      />
      <Circle cx={14.5} cy={17} r={1.6} fill={colors.textPrimary} />
      <Circle cx={22} cy={16} r={1.6} fill={colors.textPrimary} />
      <Path
        d="M15 22c1.6 1.8 6 1.8 7.5 0"
        stroke={colors.textPrimary}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M18.5 3c.5-1.4 2-2.2 3.3-1.6"
        stroke={colors.primary}
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}

export function FetusIllustration({ size = 200 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 200 230">
      <Ellipse cx={100} cy={115} rx={92} ry={108} fill={colors.peach} opacity={0.55} />
      <Ellipse cx={100} cy={115} rx={70} ry={86} fill={colors.peach} opacity={0.6} />

      <G>
        <Circle cx={112} cy={78} r={30} fill={colors.peachDeep} />
        <Path
          d="M70 100c-6 22-2 46 18 62 22 18 54 20 66 4 10-13 6-30-6-36-9-4-14 2-22-4-10-7-8-20-18-28-14-11-30-10-38 2Z"
          fill={colors.peachDeep}
        />
        <Ellipse cx={64} cy={150} rx={12} ry={9} fill={colors.peachDeep} />
        <Ellipse cx={150} cy={160} rx={11} ry={16} fill={colors.peachDeep} />
        <Circle cx={101} cy={73} r={2.2} fill={colors.textPrimary} opacity={0.55} />
        <Path
          d="M96 86c2.5 2 6 2 8.5 0"
          stroke={colors.textPrimary}
          strokeOpacity={0.4}
          strokeWidth={1.4}
          strokeLinecap="round"
          fill="none"
        />
      </G>

      <Path
        d="M150 90c3-4 8-4 10 0 2 4-1 8-10 13-9-5-12-9-10-13 2-4 7-4 10 0Z"
        fill={colors.lavenderDeep}
        opacity={0.85}
      />

      <Circle cx={40} cy={60} r={3} fill={colors.peachDeep} opacity={0.5} />
      <Circle cx={160} cy={190} r={4} fill={colors.peachDeep} opacity={0.5} />
      <Circle cx={168} cy={70} r={2.5} fill={colors.peachDeep} opacity={0.5} />
    </Svg>
  )
}

export function BellyMark({ size = 22, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9 2c-.6 1.4-1.6 2-2.6 2.4C4 5.3 3 7.3 3 10c0 5 3 9 3 12"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M9 6c5 0 8.5 3.6 8.5 9s-4 8-4 7"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M13 12.2c1-1.4 3-1.4 3.6 0 .6 1.4-.6 2.6-3.6 4-3-1.4-4.2-2.6-3.6-4 .6-1.4 2.6-1.4 3.6 0Z"
        fill={color}
      />
    </Svg>
  )
}

type Mood = 'happy' | 'calm' | 'okay' | 'tired' | 'anxious'

export function MoodFace({ mood, size = 26, color }: { mood: Mood; size?: number; color: string }) {
  const mouth: Record<Mood, string> = {
    happy: 'M8 15c1.6 2.4 6.4 2.4 8 0',
    calm: 'M8 15.5c1.6 1.6 6.4 1.6 8 0',
    okay: 'M8 15.5h8',
    tired: 'M8 16c1.6 -1.4 6.4 -1.4 8 0',
    anxious: 'M8 17c1.6 -2.4 6.4 -2.4 8 0',
  }
  const eyes = mood === 'tired'
    ? <Path d="M7.5 10.5h3M13.5 10.5h3" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    : (
      <>
        <Circle cx={9} cy={10.5} r={1.1} fill={color} />
        <Circle cx={15} cy={10.5} r={1.1} fill={color} />
      </>
    )
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.6} fill="none" />
      {eyes}
      <Path d={mouth[mood]} stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </Svg>
  )
}
