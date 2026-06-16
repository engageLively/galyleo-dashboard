/**
 * Renders an Image morph from the dashboard spec.
 * Positions itself absolutely using `morphicToCSS` and renders the image
 * with `object-fit: contain` to preserve aspect ratio within the morph bounds.
 */

import { morphicToCSS } from '../utils/morphicStyles';
import type { MorphDescriptor } from '../types/dashboard';

interface Props {
  descriptor: MorphDescriptor;
}

/** Absolutely-positioned image widget derived from a `MorphDescriptor`. */
export function ImageWidget({ descriptor }: Props) {
  const style = morphicToCSS(descriptor.morphicProperties);
  return (
    <div style={style}>
      {descriptor.imageUrl && (
        <img
          src={descriptor.imageUrl}
          alt={descriptor.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}
    </div>
  );
}
