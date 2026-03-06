import Svg, { Rect, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export function SOLIcon({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Defs>
        <LinearGradient id="sol_grad0" x1="16.0008" y1="85.3888" x2="40.6114" y2="85.1621" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#599DB0" />
          <Stop offset="1" stopColor="#47F8C3" />
        </LinearGradient>
        <LinearGradient id="sol_grad1" x1="16.0008" y1="24.2246" x2="40.4541" y2="24.0366" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#C44FE2" />
          <Stop offset="1" stopColor="#73B0D0" />
        </LinearGradient>
        <LinearGradient id="sol_grad2" x1="17.3808" y1="28.0046" x2="39.0701" y2="28.0046" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#778CBF" />
          <Stop offset="1" stopColor="#5DCDC9" />
        </LinearGradient>
      </Defs>

      <Rect width="56" height="56" rx="28" fill="black" />

      <Path
        d="M36.5501 22.5368C36.4003 22.6741 36.2053 22.7515 36.0021 22.7541H16.7728C16.0901 22.7541 15.7461 21.9741 16.2181 21.5168L19.3768 18.4714C19.5235 18.3293 19.7191 18.2486 19.9234 18.2461H39.2261C39.9154 18.2461 40.2528 19.0328 39.7728 19.4928L36.5501 22.5368Z"
        fill="url(#sol_grad0)"
      />
      <Path
        d="M36.5501 37.5446C36.3994 37.6795 36.2044 37.7544 36.0021 37.7552H16.7728C16.0901 37.7552 15.7461 36.9819 16.2181 36.5246L19.3768 33.4712C19.5248 33.332 19.7202 33.2543 19.9234 33.2539H39.2261C39.9154 33.2539 40.2528 34.0352 39.7728 34.4912L36.5501 37.5446Z"
        fill="url(#sol_grad1)"
      />
      <Path
        d="M36.5501 25.9646C36.3994 25.8297 36.2044 25.7547 36.0021 25.7539H16.7728C16.0901 25.7539 15.7461 26.5272 16.2181 26.9846L19.3768 30.0379C19.5248 30.1752 19.7194 30.2512 19.9234 30.2552H39.2261C39.9154 30.2552 40.2528 29.4739 39.7728 29.0179L36.5501 25.9646Z"
        fill="url(#sol_grad2)"
      />
    </Svg>
  );
}
