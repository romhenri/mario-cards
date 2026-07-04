"use client";

interface TargetPromptProps {
  visible: boolean;
}

export function TargetPrompt({ visible }: TargetPromptProps) {
  if (!visible) return null;
  return (
    <span className="target-prompt">
      Select a target (an enemy creature or &quot;Attack face&quot;)
    </span>
  );
}
