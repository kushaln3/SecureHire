interface StepBadgeProps {
  step: number;
}

export default function StepBadge({ step }: StepBadgeProps) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/25 shrink-0">
      {step}
    </div>
  );
}
