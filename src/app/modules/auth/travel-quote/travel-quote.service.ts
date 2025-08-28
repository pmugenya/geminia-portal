import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TravelQuote, InsurancePlan, PlanBenefit } from './travel-quote.models';

@Injectable({
  providedIn: 'root'
})
export class TravelQuoteService {
  private quoteSubject = new BehaviorSubject<TravelQuote | null>(null);
  public quote$ = this.quoteSubject.asObservable();

  private currentStepSubject = new BehaviorSubject<number>(1);
  public currentStep$ = this.currentStepSubject.asObservable();

  updateQuote(quote: Partial<TravelQuote>): void {
    const currentQuote = this.quoteSubject.value;
    const updatedQuote = { ...currentQuote, ...quote } as TravelQuote;
    this.quoteSubject.next(updatedQuote);
  }

  setCurrentStep(step: number): void {
    this.currentStepSubject.next(step);
  }

  getCurrentStep(): number {
    return this.currentStepSubject.value;
  }

  getInsurancePlans(): InsurancePlan[] {
    const benefits: PlanBenefit[] = [
      { name: 'Personal Accident', goldPlan: 25000, premiumOutbound: 25000 },
      { name: 'Emergency Medical Expenses & Evacuation', goldPlan: 200000, premiumOutbound: 100000 },
      { name: 'Repatriation of Mortal Remains', goldPlan: 12500, premiumOutbound: 10000 },
      { name: 'Emergency Dental Care', goldPlan: 750, premiumOutbound: 600 },
      { name: 'Hospital Benefits', goldPlan: '25 Accumulation 250', premiumOutbound: '10 Accumulation 100' },
      { name: 'Delayed Baggage', goldPlan: '$50 per 12 hrs upto max $ 400', premiumOutbound: '$50 per 12 hrs upto max $ 250' },
      { name: 'Loss of Checked Baggage & Personal Effects', goldPlan: 1000, premiumOutbound: 1000 },
      { name: 'Personal Liability', goldPlan: 150000, premiumOutbound: 150000 },
      { name: 'Hijack', goldPlan: '$100 per 24 hrs upto max $ 7,500', premiumOutbound: '$100 per 24 hrs upto max $ 5,000' },
      { name: 'Loss of passport', goldPlan: 150, premiumOutbound: 150 },
      { name: 'Cancellation and Curtailment', goldPlan: 1500, premiumOutbound: 1500 },
      { name: 'Travel Delay', goldPlan: '$50 per 12 hrs upto max $ 200', premiumOutbound: '$50 per 12 hrs upto max $ 200' },
      { name: 'War, Political Violence and Terrorism', goldPlan: 'Covered at an extra premium of 25 percent of the Basic premiums', premiumOutbound: 'Covered at an extra premium of 25 percent of the Basic premiums' },
      { name: 'Covid Extension', goldPlan: 'Covered at an extra premium of 20 percent of the Basic premiums', premiumOutbound: 'Covered at an extra premium of 20 percent of the Basic premiums' }
    ];

    return [
      {
        name: 'Gold Plan',
        benefits,
        totalPremium: 27.00,
        currency: 'USD',
        addOns: [
          { name: 'Include War and Terrorism Premium', selected: false },
          { name: 'Include Covid Extension Premium', selected: false }
        ]
      },
      {
        name: 'Premium Outbound',
        benefits,
        totalPremium: 23.00,
        currency: 'USD',
        addOns: [
          { name: 'Include War and Terrorism Premium', selected: false },
          { name: 'Include Covid Extension Premium', selected: false }
        ]
      }
    ];
  }

  calculateNumberOfDays(departure: Date, returnDate: Date): number {
    const diffTime = Math.abs(returnDate.getTime() - departure.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  generateQuoteNumber(): string {
    return 'QU000197202506';
  }
}