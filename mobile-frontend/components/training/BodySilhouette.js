import React from 'react';
import Svg, { Ellipse, Rect, Circle, Path } from 'react-native-svg';
import { BODY_SPOTS, C, fatigueColor } from '../../data/trainingData';

const UNTRAINED = 'rgba(255,255,255,0.07)';

export default function BodySilhouette({ fatigueMap, selectedMuscle, onMusclePress }) {
  const colorOf = (muscleId) => {
    if (selectedMuscle && muscleId !== selectedMuscle) return 'rgba(255,255,255,0.04)';
    const entry = fatigueMap[muscleId];
    if (!entry) return selectedMuscle === muscleId ? C.lime : UNTRAINED;
    return fatigueColor(entry.fatigue_pct);
  };
  const opacityOf = (muscleId) => {
    if (selectedMuscle && muscleId !== selectedMuscle) return 0.3;
    return colorOf(muscleId) === UNTRAINED ? 0.6 : 0.9;
  };

  return (
    <Svg width={120} height={265} viewBox="0 0 120 265">
      <Circle cx={60} cy={18} r={14} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={55} y={31} width={10} height={11} rx={4} fill="#1A1538" />
      <Rect x={28} y={40} width={64} height={98} rx={12} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={10} y={46} width={18} height={60} rx={9} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={92} y={46} width={18} height={60} rx={9} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={11} y={104} width={15} height={50} rx={7} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={94} y={104} width={15} height={50} rx={7} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={31} y={136} width={26} height={72} rx={13} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={63} y={136} width={26} height={72} rx={13} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={33} y={205} width={22} height={55} rx={11} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={65} y={205} width={22} height={55} rx={11} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {BODY_SPOTS.map((spot, i) => (
        <Ellipse
          key={i}
          cx={spot.cx} cy={spot.cy} rx={spot.rx} ry={spot.ry}
          fill={colorOf(spot.id)}
          opacity={opacityOf(spot.id)}
          onPress={() => onMusclePress?.(spot.id === selectedMuscle ? null : spot.id)}
        />
      ))}
      <Circle cx={55} cy={15} r={2} fill="rgba(255,255,255,0.15)" />
      <Circle cx={65} cy={15} r={2} fill="rgba(255,255,255,0.15)" />
      <Path d="M55 22 Q60 26 65 22" stroke="rgba(255,255,255,0.15)" strokeWidth={1} fill="none" />
    </Svg>
  );
}
