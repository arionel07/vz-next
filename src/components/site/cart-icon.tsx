type CartIconProps = {
  size?: number
  className?: string
}

export function CartIcon({ size = 25, className }: CartIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      height={size}
      viewBox="0 0 25 25"
      width={size}
    >
      <path
        d="M3.759 6.75h17.5v16.5h-17.5V6.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M16.75 9V5.31c0-1.143-.448-2.24-1.245-3.047A4.22 4.22 0 0 0 12.5 1a4.22 4.22 0 0 0-3.005 1.263A4.342 4.342 0 0 0 8.25 5.31V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}
