/**
 * EATECH Mobile App - Icon Components
 * Version: 25.0.0
 * Description: Custom Icon Components für die EATECH Admin App
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/components/Icons.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

// ============================================================================
// ICON COMPONENTS
// ============================================================================

export const Mail = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 6l-10 7L2 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const Lock = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="5"
      y="11"
      width="14"
      height="11"
      rx="2"
      ry="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 11V7a5 5 0 0110 0v4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const Fingerprint = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10-10-4.48-10-10z"
      stroke={color}
      strokeWidth="2"
    />
    <Path
      d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M12 14v8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const FaceRecognition = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="2"
    />
    <Path
      d="M8 14s1.5 2 4 2 4-2 4-2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Line
      x1="9"
      y1="9"
      x2="9.01"
      y2="9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Line
      x1="15"
      y1="9"
      x2="15.01"
      y2="9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

// ============================================================================
// EXPORT ALL ICONS
// ============================================================================
export default {
  Mail,
  Lock,
  Fingerprint,
  FaceRecognition,
};