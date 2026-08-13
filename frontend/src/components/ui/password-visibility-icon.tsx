export function PasswordVisibilityIcon({ isVisible }: { isVisible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 18 18"
      width="18"
    >
      <path
        d="M2.25 9s2.35-4.25 6.75-4.25S15.75 9 15.75 9 13.4 13.25 9 13.25 2.25 9 2.25 9Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M9 10.75A1.75 1.75 0 1 0 9 7.25a1.75 1.75 0 0 0 0 3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      {!isVisible ? (
        <path
          d="M14.25 3.75 3.75 14.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      ) : null}
    </svg>
  );
}
