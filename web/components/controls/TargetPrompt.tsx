"use client";

interface TargetPromptProps {
  visible: boolean;
  onCancel: () => void;
}

export function TargetPrompt({ visible, onCancel }: TargetPromptProps) {
  if (!visible) return null;
  return (
    <span className="target-prompt">
      Select a target (an enemy creature or &quot;Attack face&quot;){" "}
      <button onClick={onCancel}>Cancel</button>
    </span>
  );
}
