import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Polyline, Line, Text as SvgText, G} from 'react-native-svg';
import type {DriftEntry} from '../types';
import {useTheme} from './ThemeContext';

interface Props {
  entries: DriftEntry[];
  width?: number;
  height?: number;
}

const PADDING = {top: 16, right: 16, bottom: 40, left: 48};

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function DriftChart({entries, width = 320, height = 200}: Props) {
  const {colors} = useTheme();

  const rated = useMemo(
    () => entries.filter(e => e.driftPerDay !== null),
    [entries],
  );

  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  if (rated.length < 2) {
    return (
      <View style={[styles.empty, {width, height}]}>
        <Text style={[styles.emptyText, {color: colors.subtext}]}>
          Not enough data to display chart
        </Text>
      </View>
    );
  }

  const timestamps = rated.map(e => Date.parse(e.measurement.timestamp));
  const rates = rated.map(e => e.driftPerDay as number);

  const minX = Math.min(...timestamps);
  const maxX = Math.max(...timestamps);
  const minY = Math.min(...rates);
  const maxY = Math.max(...rates);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const toSvgX = (t: number) => ((t - minX) / rangeX) * chartWidth;
  const toSvgY = (v: number) =>
    chartHeight - ((v - minY) / rangeY) * chartHeight;

  const points = rated
    .map(e => {
      const x = toSvgX(Date.parse(e.measurement.timestamp));
      const y = toSvgY(e.driftPerDay as number);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // X-axis labels — show at most 5 evenly spaced
  const step = Math.max(1, Math.floor(rated.length / 5));
  const xLabels = rated.filter((_, i) => i % step === 0 || i === rated.length - 1);

  // Y-axis labels — 5 ticks
  const yTicks = Array.from({length: 5}, (_, i) => {
    const v = minY + (rangeY / 4) * i;
    return {v, y: toSvgY(v)};
  });

  return (
    <Svg
      width={width}
      height={height}
      accessibilityLabel="Drift rate chart"
      accessibilityRole="image">
      <G translateX={PADDING.left} translateY={PADDING.top}>
        {/* Y-axis gridlines & labels */}
        {yTicks.map(({v, y}, i) => (
          <G key={i}>
            <Line
              x1={0}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
            />
            <SvgText
              x={-4}
              y={y + 4}
              textAnchor="end"
              fill={colors.subtext}
              fontSize={10}>
              {v.toFixed(1)}
            </SvgText>
          </G>
        ))}

        {/* X-axis */}
        <Line
          x1={0}
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* Y-axis */}
        <Line
          x1={0}
          y1={0}
          x2={0}
          y2={chartHeight}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* Data polyline */}
        <Polyline
          points={points}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
        />

        {/* X-axis labels */}
        {xLabels.map((e, i) => {
          const x = toSvgX(Date.parse(e.measurement.timestamp));
          return (
            <SvgText
              key={i}
              x={x}
              y={chartHeight + 20}
              textAnchor="middle"
              fill={colors.subtext}
              fontSize={10}>
              {formatDateLabel(e.measurement.timestamp)}
            </SvgText>
          );
        })}
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: {justifyContent: 'center', alignItems: 'center'},
  emptyText: {fontSize: 13},
});
