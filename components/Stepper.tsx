import { Check } from 'lucide-react';

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-start justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                  index <= currentStep
                    ? 'bg-black border-blue-600'
                    : 'bg-white border-gray-300'
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                ) : (
                  <span className={`text-xs sm:text-sm font-bold ${index === currentStep ? 'text-white' : 'text-gray-400'}`}>
                    {index + 1}
                  </span>
                )}
              </div>
      <span className="mt-2 text-[10px] sm:text-xs font-medium text-gray-600 text-center leading-tight w-[56px] sm:w-auto">
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 sm:mx-4 mb-5 ${
                  index < currentStep ? 'bg-black' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
