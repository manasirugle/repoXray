"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface PhaseTwoModalProps {
  featureTitle: string;
  onClose: () => void;
}

export default function PhaseTwoModal({ featureTitle, onClose }: PhaseTwoModalProps) {
  return (
    <div className="phase2-modal-overlay" onClick={onClose}>
      <div className="phase2-modal" onClick={(e) => e.stopPropagation()}>
        <span className="phase2-modal-badge">Phase 2</span>
        <h3 className="phase2-modal-title">
          <Sparkles className="text-violet-400" size={22} />
          <span>{featureTitle}</span>
        </h3>
        <p className="phase2-modal-desc">
          This feature is planned for Phase 2 of the project and is currently under development.
        </p>
        <p className="phase2-modal-desc">
          The current review version includes the core repository analysis pipeline. Additional
          modules will be demonstrated in the next phase.
        </p>
        <div className="phase2-modal-actions">
          <button onClick={onClose} className="phase2-modal-btn-close">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
