/**
 * Active renderer registry.
 *
 * `ACTIVE_RENDERER` is the single import that determines which charting library
 * is used across the entire app. Change it here to swap Google Charts for any
 * other library that implements {@link ChartRendererProps}.
 */

import type { ComponentType } from 'react';
import type { ChartRendererProps } from './types';
import { GoogleChartsRenderer } from './GoogleChartsRenderer';

/** The chart renderer component currently in use. */
export const ACTIVE_RENDERER: ComponentType<ChartRendererProps> = GoogleChartsRenderer;
