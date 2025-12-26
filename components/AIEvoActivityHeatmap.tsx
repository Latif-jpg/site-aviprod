// components/AIEvoActivityHeatmap.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Svg, G, Rect, Text as SvgText } from 'react-native-svg';
import { futuristicColors } from '../styles/ai-dashboard-styles';

interface ActivityDataPoint {
  created_at: string;
}

interface AIEvoActivityHeatmapProps {
  activityData: ActivityDataPoint[];
  width: number;
  height: number;
}

const AIEvoActivityHeatmap: React.FC<AIEvoActivityHeatmapProps> = ({ activityData, width, height }) => {
  const days = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const cellSize = Math.min(width / (hours.length + 1), height / (days.length + 1));
  const xOffset = 30;
  const yOffset = 20;

  const processData = () => {
    const grid: number[][] = Array(days.length).fill(0).map(() => Array(hours.length).fill(0));
    let maxActivity = 0;

    if (activityData) {
        activityData.forEach(item => {
            const date = new Date(item.created_at);
            const day = date.getDay();
            const hour = date.getHours();
            grid[day][hour]++;
            if (grid[day][hour] > maxActivity) {
            maxActivity = grid[day][hour];
            }
        });
    }

    return { grid, maxActivity };
  };

  const { grid, maxActivity } = processData();

  const getColor = (value: number) => {
    if (value === 0) return futuristicColors.glassBackground;
    const intensity = value / maxActivity;
    if (intensity > 0.8) return futuristicColors.amber;
    if (intensity > 0.5) return futuristicColors.primary;
    if (intensity > 0.2) return futuristicColors.violet;
    return futuristicColors.border;
  };

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <G>
          {/* Y-Axis Labels (Days) */}
          {days.map((day, i) => (
            <SvgText
              key={`day-${i}`}
              x={xOffset - 10}
              y={yOffset + i * cellSize + cellSize / 2}
              fill={futuristicColors.textSecondary}
              fontSize="10"
              textAnchor="end"
            >
              {day}
            </SvgText>
          ))}
          
          {/* X-Axis Labels (Hours) */}
          {hours.filter(h => h % 3 === 0).map((hour, i) => (
             <SvgText
              key={`hour-${i}`}
              x={xOffset + hour * cellSize + cellSize / 2}
              y={yOffset - 5}
              fill={futuristicColors.textSecondary}
              fontSize="8"
              textAnchor="middle"
            >
              {`${hour}h`}
            </SvgText>
          ))}

          {/* Heatmap Cells */}
          {grid.map((row, dayIndex) =>
            row.map((value, hourIndex) => (
              <Rect
                key={`${dayIndex}-${hourIndex}`}
                x={xOffset + hourIndex * cellSize}
                y={yOffset + dayIndex * cellSize}
                width={cellSize - 1}
                height={cellSize - 1}
                fill={getColor(value)}
                rx={2}
                ry={2}
              />
            ))
          )}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AIEvoActivityHeatmap;
