import Svg, { Rect, Image } from 'react-native-svg';

// Seeker uses a PNG image rendered inside an SVG frame
const SEEKER_BASE64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAGeUlEQVR4AeyaCYhVVRjH3yRl2TIFLThlK1JSSBFkSNFKgWObRIslZVYTZaNTjdOQUUmamTQTZqZkDVEoiZSV7QRZliA0RbsZyORURlFpk0vZ6/fX94b3unPPuefchTfMG77ffOfe853t/+5y7rl3j9wA/6sKMMAPgFz1CKgeAQNcgcxOgXw+XwdjoAlmQzvMA3ltTyVdD8OgJqvfJVUBGMhQWAgbGFA3rIRHoQWmwGSQ13Yb6VehCzZSpgMugUFsp2apCkCvT4Cb4ShwsTqCr4OXoAsRmmFf0olb2gIk0WGJMYeK1iHC5fhErT8IUBywhFiGCDo19i7ujOv7kwDFserUeAsh9i/uiOP7owAa75n8W4EIe+FjWdYCbKK3uhPMxD9QYAZe5/i7+K0Q1c4hUHcUnL9lJcCLdPEMqKupqRkL0+H+AvfhW+A88g+CCfApRLHbOArOjRIYFpO2AJtpuJ7BjYPV8C/boUb+dniOgFOhGf4Gm7UhQuSJ0/8r8xaARjVra8CHMYnGOhnQa3gno8xOmEuhS2EHmGwkmfXgZd4C0Nrz8KSBkQzC+ItT1miUl3gNxqDdmTptdqcc/3sJwK8u1WstbUkcS4g9GxE6iHobTDaWPnmNxasQPTkcTPYnHf/KFOCYp7uGqcgQMk8BZ/MV4GhLS1ss+a7ZqyjwE5jsWFNmWJ6vALapqH6RsDad93M05SmkAe6HD0MPTmS7ma8AP1uaqeWcPN4S45SNCFuhx0CUW2agTV8BNgZqCu7QfTy4t8L2+ArwDePQYYkLtUkcBXeG5lZIhpcAHIa6IH0dYQxzEWElaGEkQnj2IV4CFLq5pOBtbgwBXyDCG3A9HMZ2xVgcARYwij8giqmdCwl8Bn5EhM9gAUyAEZDquh9thpo6FpppyuA0+IX8aeBqenA5iUK3wLPwJWxGhI9AC6iT8aMgE1G8BaDTOURYhH8a4prmDadTiRZQ5+HXQA8ivAlT4Di2U7FYAhR6pE5rvl7YTMwNpqYLoB3WI0In6OiwPYMQHt1iC8BRsJPmboBG+AvSspOpWEfHBoS4C/Zk22q2gNgCqAFEyIM6N4LtxWB7hifE2w6k5CPwPiIciY9liQhQ7AEidMGNbKtjd+DXgm3CRIiXjaLUh4gg0Un6WaICFLuACJugDU5j3zCYCLpO6IpPMjHTY7mWyL3nFqkIUDo8ROiGDpgIJ5K3D5wFei+ou8jHpHUdwXnZEZTyvhOlLgCdKzNE2AarYD40gBZA9YirtX69JNULUi2mlpWzbOits+4YlrBgduYCBLuQ03xConyAGHPgolwudwhoQfQ9fFTTxCpqbG9cRQjQ25tCAhF2wAo4m11XQ5QjQuuCzrfGihSAAfcaIixlQ2+BbG+NNHhddAmPbhUvgIaCCLpQzlLagi6IlpDybGcBuO+OhnsKtOLvhmmgjxg0Q7usvInEtqJc6Y9xbc1ZABqQyg/ihX6Vh0g/DHrBqRma0mwmaxwFP1Djr2AyPT+Y8gN5PgJ8H6ilfMdwjobh5bsS29pmqckmUKC4jwCa3trm+l63pEDvSnYgqr4FOLRkV1/J7/raadrnLACH4j9U+A6Y7FY6rHV8U4xr3mgK6EqPC7XPQ3NCMpwFKNSjW1Mh2afTi5MliDCkz1y/nVMtxdbx49hOz0AVvgK8QE1aGcaFmu7J+owl9rc8CHkArbwOOrXCuIn8nCteAqD0dhrS1R9ntPPJXcsAJAZJN6PcINC6oz6cWEi7JvT+0K0Bor0EoJzsCf51gs30imwNA1kKmkNoUdRYhrjBcA1BmgDpthqnn1QTbt4V82voYngtVfeAzTToKwlaDd0MbjnMgEYYD1oeb8HPAl1gfyNOn8roOwSS6Zm3AOoSImiBYzxpiYGLZEOJGgf3wmOgL020PD6bdCvoYymtGZBM32IJoO4hwsv4q8A2SSGk8iy2ABoSIizH64lNX3qT7D+WiAAaLiLoZYbe+MxnO84SF8Wzs8QEUJcRYQtorU8rtU+xr+JPi0QFYMC7DBG+BU1MdMHTMrm+FNWVfVd+xH96yVL8TE7zjojF3MJSEaDYBUT4HRaDrvoHs19PiRfjm0BXfb32epy0Xqrow8jppK8AffFVSzl9ZboIH+t7Q+oLtVQFKG1Vg4D18Aq0Qys0we3QCM0wE5bBJ+Byay1tyimdmQBOvcowuCpAhmJXZFPVI6AifxaHTsUN/Q8AAP//CBnsAgAAAAZJREFUAwB8kh+fxPaYnwAAAABJRU5ErkJggg==`;

export function SeekerIcon({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      {/* Black rounded background */}
      <Rect width="56" height="56" rx="28" fill="black" />

      {/* Seeker PNG image centered at x=12 y=12, width=32 height=32 */}
      <Image
        x="12"
        y="12"
        width="32"
        height="32"
        href={SEEKER_BASE64}
        preserveAspectRatio="none"
      />
    </Svg>
  );
}
