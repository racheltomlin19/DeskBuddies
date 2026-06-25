import { X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

interface ToolPopoutProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  style?: CSSProperties;
}

export function ToolPopout({ title, onClose, children, style }: ToolPopoutProps) {
  return (
    <aside className="tool-popout" aria-label={`${title} pop-out`} style={style}>
      <header className="tool-popout-head">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`}>
          <X size={17} />
        </button>
      </header>
      <div className="tool-popout-body">{children}</div>
    </aside>
  );
}
