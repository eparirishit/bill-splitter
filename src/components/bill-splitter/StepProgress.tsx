
import React from 'react';
import { Step } from '@/types';

interface StepProgressProps {
  currentStep: Step;
}

const steps = [
  { label: 'Source', icon: 'fa-camera' },
  { label: 'Group', icon: 'fa-user-group' },
  { label: 'Split', icon: 'fa-scissors' },
  { label: 'Review', icon: 'fa-signature' },
];

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep }) => {
  if (currentStep <= Step.FLOW_SELECTION || currentStep === Step.SUCCESS) return null;

  return (
    <div className="px-6 pt-6 pb-2 sticky top-0 z-50 animate-fade-in">
      <div className="glass border-border rounded-[2rem] p-4 border shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-1 flex-1">
          {steps.map((step, index) => {
            const stepIndex = index + 1;
            const isActive = stepIndex === currentStep;
            const isCompleted = stepIndex < currentStep;

            return (
              <React.Fragment key={index}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 shrink-0 ${isActive
                      ? 'bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20'
                      : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground/40'
                    }`}
                >
                  <i className={`fas ${step.icon} text-[10px]`}></i>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-[2px] mx-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-700"
                      style={{ width: isCompleted ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="ml-4 border-l border-border pl-4 text-right">
          <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">
            Step 0{currentStep}
          </p>
          <p className="text-[10px] font-bold text-foreground uppercase truncate max-w-[80px]">
            {steps[currentStep - 1]?.label}
          </p>
        </div>
      </div>
    </div>
  );
};
