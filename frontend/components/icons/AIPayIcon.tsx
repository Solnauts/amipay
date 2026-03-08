// File: components/ui/FigmaPayIcon.tsx
import React from "react";
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  FeBlend,
  FeFlood,
  FeGaussianBlur,
  Filter,
  G,
  Rect,
} from "react-native-svg";

export const AIPayIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Defs>
        <ClipPath id="clip0">
          <Rect width="16" height="16" rx="8" fill="white" />
        </ClipPath>
        <Filter
          id="filter1"
          x="-4"
          y="0"
          width="21"
          height="20"
          filterUnits="userSpaceOnUse"
        >
          <FeFlood floodOpacity="0" result="BackgroundImageFix" />
          <FeBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <FeGaussianBlur stdDeviation="2" result="effect1_foregroundBlur" />
        </Filter>
      </Defs>

      <G clipPath="url(#clip0)">
        {/* Background circle */}
        <Rect width="16" height="16" rx="8" fill="#8154F7" />

        {/* Blurred ellipses for the glassy sheen */}
        <G filter="url(#filter1)">
          <Ellipse cx="5.5" cy="9.07692" rx="5.5" ry="5.07692" fill="#673BDB" />
          <Ellipse cx="5.5" cy="9.07692" rx="5.5" ry="5.07692" fill="white" />
          <Ellipse cx="7.5" cy="10.9226" rx="5.5" ry="5.07692" fill="#D2C1FF" />
        </G>
      </G>
    </Svg>
  );
};
