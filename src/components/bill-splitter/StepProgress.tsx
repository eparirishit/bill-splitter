
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
      <div className="glass dark:border-slate-800 rounded-[2rem] p-4 border border-gray-100 dark:border-slate-800 shadow-xl dark:shadow-none flex items-center justify-between">
        <div className="flex items-center gap-1 flex-1">
          {steps.map((step, index) => {
            const stepIndex = index + 1;
            const isActive = stepIndex === currentStep;
            const isCompleted = stepIndex < currentStep;

            return (
              <React.Fragment key={index}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 shrink-0 ${isActive
                      ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-100 dark:shadow-none'
                      : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600'
                    }`}
                >
                  <i className={`fas ${step.icon} text-[10px]`}></i>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-[2px] mx-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
        <div className="ml-4 border-l border-gray-100 dark:border-slate-800 pl-4 text-right">
          <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">
            Step 0{currentStep}
          </p>
          <p className="text-[10px] font-bold text-gray-900 dark:text-white uppercase truncate max-w-[80px]">
            {steps[currentStep - 1]?.label}
          </p>
        </div>
      </div>
    </div>
  );
};
