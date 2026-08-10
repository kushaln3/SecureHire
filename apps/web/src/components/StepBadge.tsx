interface StepBadgeProps {
  step: number;
}

export default function StepBadge({ step }: StepBadgeProps) {
  return (
    <div style={{
      width: '2rem', height: '2rem', borderRadius: '9999px',
      background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 700, fontSize: '0.875rem',
      flexShrink: 0,
    }}>
      {step}
    </div>
  );
}
