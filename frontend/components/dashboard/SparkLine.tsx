'use client';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparkLineProps {
  data: { day: number; v: number }[];
  color?: string;
}

export default function SparkLine({ data, color = 'var(--chart-purple)' }: SparkLineProps) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
