// Swap ACTIVE_RENDERER to use a different charting library.
// Any component that satisfies ChartRendererProps works here.

import type { ComponentType } from 'react';
import type { ChartRendererProps } from './types';
import { GoogleChartsRenderer } from './GoogleChartsRenderer';

export const ACTIVE_RENDERER: ComponentType<ChartRendererProps> = GoogleChartsRenderer;
