type LockIconProps = {
  locked: boolean
}

export function LockIcon({ locked }: LockIconProps) {
  if (locked) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="lock-icon">
        <path d="M7 10V8a5 5 0 1 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm2 0h6V8a3 3 0 1 0-6 0v2Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="lock-icon">
      <path d="M17 10h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h9V8a3 3 0 1 0-6 0 1 1 0 0 1-2 0 5 5 0 1 1 10 0v2Z" />
    </svg>
  )
}
