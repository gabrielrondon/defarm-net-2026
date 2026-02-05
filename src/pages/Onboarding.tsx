import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  OnboardingLayout,
  StepIdentifier,
  StepDFID,
  StepPortfolio,
  StepCompliance,
  StepFinance,
} from "@/components/onboarding";
import { generateDFID } from "@/lib/fake-id-generator";

interface PortfolioItem {
  id: string;
  identifier: string;
  dfid: string;
}

interface ComplianceChecks {
  environmental: boolean | null;
  eudr: boolean | null;
  documentation: boolean | null;
}

interface OnboardingState {
  currentStep: number;
  identifier: {
    value: string;
    isFake: boolean;
  };
  dfid: string | null;
  portfolio: PortfolioItem[];
  complianceChecks: ComplianceChecks;
}

const STORAGE_KEY = "defarm_onboarding";
const TOTAL_STEPS = 5;

const getInitialState = (): OnboardingState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if data is less than 24h old
      if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.state;
      }
    }
  } catch {
    // Ignore parse errors
  }
  
  return {
    currentStep: 1,
    identifier: { value: "", isFake: false },
    dfid: null,
    portfolio: [],
    complianceChecks: {
      environmental: null,
      eudr: null,
      documentation: null,
    },
  };
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [state, setState] = useState<OnboardingState>(getInitialState);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      state,
      timestamp: Date.now(),
    }));
  }, [state]);

  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: number) => {
    updateState({ currentStep: Math.min(Math.max(1, step), TOTAL_STEPS) });
  };

  const handleIdentifierChange = (value: string, isFake: boolean) => {
    updateState({ identifier: { value, isFake } });
  };

  const handleDFIDGenerated = (dfid: string) => {
    updateState({ dfid });
  };

  const handleStep1Complete = () => {
    // Create first portfolio item when moving to step 2
    const firstItem: PortfolioItem = {
      id: crypto.randomUUID(),
      identifier: state.identifier.value,
      dfid: state.dfid || generateDFID(),
    };
    
    updateState({ 
      portfolio: [firstItem],
      dfid: firstItem.dfid,
    });
    goToStep(2);
  };

  const handleAddPortfolioItem = (item: PortfolioItem) => {
    updateState({ portfolio: [...state.portfolio, item] });
  };

  const handleRemovePortfolioItem = (id: string) => {
    updateState({ portfolio: state.portfolio.filter(i => i.id !== id) });
  };

  const handleComplianceComplete = (checks: ComplianceChecks) => {
    updateState({ complianceChecks: checks });
  };

  const handleSavePortfolio = () => {
    // Navigate to cadastro with portfolio data in state
    navigate("/cadastro", { 
      state: { 
        fromOnboarding: true,
        portfolio: state.portfolio,
      } 
    });
    // Clear onboarding data
    localStorage.removeItem(STORAGE_KEY);
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <StepIdentifier
            value={state.identifier.value}
            onChange={handleIdentifierChange}
            onNext={handleStep1Complete}
          />
        );
      case 2:
        return (
          <StepDFID
            identifier={state.identifier.value}
            dfid={state.dfid}
            onDFIDGenerated={handleDFIDGenerated}
            onNext={() => goToStep(3)}
          />
        );
      case 3:
        return (
          <StepPortfolio
            items={state.portfolio}
            onAddItem={handleAddPortfolioItem}
            onRemoveItem={handleRemovePortfolioItem}
            onNext={() => goToStep(4)}
          />
        );
      case 4:
        return (
          <StepCompliance
            itemCount={state.portfolio.length}
            checks={state.complianceChecks}
            onChecksComplete={handleComplianceComplete}
            onNext={() => goToStep(5)}
          />
        );
      case 5:
        return (
          <StepFinance
            itemCount={state.portfolio.length}
            onSave={handleSavePortfolio}
          />
        );
      default:
        return null;
    }
  };

  return (
    <OnboardingLayout 
      currentStep={state.currentStep} 
      totalSteps={TOTAL_STEPS}
      onStepClick={goToStep}
    >
      {renderStep()}
    </OnboardingLayout>
  );
}
