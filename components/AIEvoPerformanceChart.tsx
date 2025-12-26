// components/AIEvoPerformanceChart.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, G, Rect, Text as SvgText } from 'react-native-svg';
import { futuristicColors } from '../styles/ai-dashboard-styles';

interface PerformanceDataPoint {
  date: Date;
  successRate: number;
  label: string;
}

interface AIEvoPerformanceChartProps {
  performanceData: PerformanceDataPoint[];
}

const CHART_HEIGHT = 200;
const CHART_WIDTH = 320;
const Y_AXIS_WIDTH = 40;
const X_AXIS_HEIGHT = 20;

const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return futuristicColors.success;
    if (rate >= 80) return futuristicColors.primary;
    if (rate >= 60) return futuristicColors.warning;
    return futuristicColors.danger;
};

const AIEvoPerformanceChart: React.FC<AIEvoPerformanceChartProps> = ({ performanceData }) => {
  if (!performanceData || performanceData.length === 0) {
    return <Text style={{ color: futuristicColors.textSecondary }}>No performance data</Text>;
  }

  const maxValue = 100; // Success rate is a percentage
  const barWidth = (CHART_WIDTH - Y_AXIS_WIDTH) / performanceData.length;

  return (
    <View style={styles.container}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <G>
          {/* Y-Axis Labels */}
          <SvgText
            x={Y_AXIS_WIDTH - 10}
            y={15}
            fill={futuristicColors.textSecondary}
            fontSize="10"
            textAnchor="end"
          >
            100%
          </SvgText>
          <SvgText
            x={Y_AXIS_WIDTH - 10}
            y={(CHART_HEIGHT - X_AXIS_HEIGHT) / 2}
            fill={futuristicColors.textSecondary}
            fontSize="10"
            textAnchor="end"
          >
            50%
          </SvgText>

          {/* Data Bars and X-Axis Labels */}
          {performanceData.map((point, index) => {
            const barHeight = Math.max(((point.successRate || 0) / maxValue) * (CHART_HEIGHT - X_AXIS_HEIGHT), 5);
            const x = Y_AXIS_WIDTH + index * barWidth;
            const y = CHART_HEIGHT - X_AXIS_HEIGHT - barHeight;

            return (
              <G key={`bar-${index}`}>
                <Rect
                  x={x + barWidth * 0.2}
                  y={y}
                  width={barWidth * 0.6}
                  height={barHeight}
                  fill={getSuccessRateColor(point.successRate)}
                  rx={4}
                  ry={4}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT - X_AXIS_HEIGHT + 15}
                  fill={futuristicColors.textSecondary}
                  fontSize="10"
                  textAnchor="middle"
                >
                  {point.label}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});

export default AIEvoPerformanceChart;
