// components/AIEvoRadarChart.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Svg, G, Polygon, Line, Text as SvgText } from 'react-native-svg';
import { futuristicColors } from '../styles/ai-dashboard-styles';

interface RadarChartProps {
  data: {
    [key: string]: number; // e.g., { precision: 0.9, recall: 0.85, latency: 0.6, engagement: 0.75 }
  };
  size: number;
}

const AIEvoRadarChart: React.FC<RadarChartProps> = ({ data, size }) => {
  const center = size / 2;
  const radius = size * 0.4;
  const labels = Object.keys(data);
  const numAxes = labels.length;
  const angleSlice = (Math.PI * 2) / numAxes;

  const getPoint = (angle: number, value: number) => {
    const x = center + radius * value * Math.cos(angle - Math.PI / 2);
    const y = center + radius * value * Math.sin(angle - Math.PI / 2);
    return { x, y };
  };

  // --- Draw Grid Lines ---
  const gridLines = [0.25, 0.5, 0.75, 1].map((value, i) => {
    const points = labels.map((_, j) => {
      const point = getPoint(angleSlice * j, value);
      return `${point.x},${point.y}`;
    }).join(' ');
    return (
      <Polygon
        key={`grid-${i}`}
        points={points}
        fill="none"
        stroke={futuristicColors.border}
        strokeWidth="1"
      />
    );
  });

  // --- Draw Axes ---
  const axes = labels.map((_, i) => {
    const point = getPoint(angleSlice * i, 1);
    return (
      <Line
        key={`axis-${i}`}
        x1={center}
        y1={center}
        x2={point.x}
        y2={point.y}
        stroke={futuristicColors.border}
        strokeWidth="1"
      />
    );
  });

  // --- Draw Labels ---
  const axisLabels = labels.map((label, i) => {
    const point = getPoint(angleSlice * i, 1.15);
    return (
      <SvgText
        key={`label-${i}`}
        x={point.x}
        y={point.y}
        fill={futuristicColors.textSecondary}
        fontSize="10"
        textAnchor="middle"
        dy="0.3em"
      >
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </SvgText>
    );
  });

  // --- Draw Data Polygon ---
  const dataPoints = labels.map((label, i) => {
    const value = data[label] || 0;
    const point = getPoint(angleSlice * i, value);
    return `${point.x},${point.y}`;
  }).join(' ');

  const dataPolygon = (
    <Polygon
      points={dataPoints}
      fill={futuristicColors.primary + '80'} // Semi-transparent fill
      stroke={futuristicColors.primary}
      strokeWidth="2"
    />
  );

  return (
    <View style={styles.container}>
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {gridLines}
          {axes}
          {axisLabels}
          {dataPolygon}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AIEvoRadarChart;
