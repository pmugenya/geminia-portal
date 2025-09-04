import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Subject, take, takeUntil, debounceTime, startWith } from 'rxjs';
import { MpesaPaymentModalComponent, PaymentResult } from '../../auth/shared/payment-modal.component';
import { AuthService } from 'app/core/auth/auth.service';
import { TravelQuoteService } from './travel-quote.service';

// --- Custom Validator Functions ---

export function fullNameValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) return null;
    const names = value.trim().split(/\s+/);
    return names.length >= 2 ? null : { invalidName: true };
}

export function dobValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const dob = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dob > today) return { futureDate: true };

    const minValidYear = today.getFullYear() - 120;
    if (dob.getFullYear() < minValidYear) return { tooOld: true };

    return null;
}

/**
 * NEW: Validates that no two travelers in the FormArray have the same full name and date of birth.
 * @param control The FormArray to validate.
 */
export const duplicateTravelerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const formArray = control as FormArray;
    if (!formArray) return null;

    const uniqueTravelers = new Set<string>();
    
    for (const travelerControl of formArray.controls) {
        const fullName = travelerControl.get('fullName')?.value;
        const dob = travelerControl.get('dob')?.value;

        if (fullName && dob) {
            // Normalize name to handle whitespace and case differences
            const normalizedName = (fullName as string).trim().toLowerCase();
            const key = `${normalizedName}-${dob}`;

            if (uniqueTravelers.has(key)) {
                return { duplicateTraveler: true }; // Found a duplicate
            }
            uniqueTravelers.add(key);
        }
    }

    return null; // No duplicates found
};


// --- Data Structures ---
interface BenefitDetail { name: string; included: boolean; limit?: string; notes?: string; }
interface TravelPlan { id: string; name: string; description: string; type: 'standard'; priceUSD?: number; tags: string[]; isMostPopular?: boolean; benefits: BenefitDetail[]; }
interface Premium { baseRateUSD: number; subtotalUSD: number; groupDiscountUSD: number; ageSurchargeUSD: number; winterSportsSurchargeUSD: number; totalPayableUSD: number; totalPayableKES: number; groupDiscountPercentage: number; }

@Component({
  selector: 'app-travel-quote',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, DatePipe, DecimalPipe ],
  templateUrl: './travel-quote.component.html',
  styleUrls: ['./travel-quote.component.scss'],
})
export class TravelQuoteComponent implements OnInit, OnDestroy {
  currentStep: number = 1;
  quoteForm: FormGroup;
  travelerDetailsForm: FormGroup;
  premium: Premium = this.resetPremium();
  selectedPlanDetails: TravelPlan | null = null;
  allTravelPlans: TravelPlan[] = [];
  displayedPlans: TravelPlan[] = [];
  
  readonly standardDurations = [ {value: '4', label: 'Up to 4 days'}, {value: '7', label: 'Up to 7 days'}, {value: '10', label: 'Up to 10 days'}, {value: '15', label: 'Up to 15 days'}, {value: '21', label: 'Up to 21 days'}, {value: '31', label: 'Up to 31 days'}, {value: '62', label: 'Up to 62 days'}, {value: '92', label: 'Up to 92 days'}, {value: '180', 'label': 'Up to 180 days'}, {value: '365', label: '1 year multi-trip'} ];
  
  private unsubscribe$ = new Subject<void>();
  readonly USD_TO_KES_RATE = 130.00;

  private standardRates: { [duration: string]: { [planId: string]: number } } = {
    '4':   { 'WW_BASIC': 19.75, 'WW_PLUS': 22.32, 'WW_EXTRA': 25.17 }, '7':   { 'WW_BASIC': 25.61, 'WW_PLUS': 29.03, 'WW_EXTRA': 32.85 }, '10':  { 'WW_BASIC': 35.24, 'WW_PLUS': 40.08, 'WW_EXTRA': 45.43 }, '15':  { 'WW_BASIC': 37.79, 'WW_PLUS': 43.00, 'WW_EXTRA': 48.78 }, '21':  { 'WW_BASIC': 39.57, 'WW_PLUS': 45.04, 'WW_EXTRA': 51.10 }, '31':  { 'WW_BASIC': 60.59, 'WW_PLUS': 69.15, 'WW_EXTRA': 78.61 }, '62':  { 'WW_BASIC': 91.54, 'WW_PLUS': 104.62, 'WW_EXTRA': 119.12 }, '92':  { 'WW_BASIC': 117.79, 'WW_PLUS': 134.71, 'WW_EXTRA': 153.44 }, '180': { 'WW_BASIC': 127.37, 'WW_PLUS': 145.61, 'WW_EXTRA': 165.82 }, '365': { 'WW_BASIC': 163.53, 'WW_PLUS': 186.98, 'WW_EXTRA': 212.97 }
  };
  
  constructor(
    private fb: FormBuilder, private router: Router, private dialog: MatDialog, private authService: AuthService, private travelQuoteService: TravelQuoteService
  ) {
    this.quoteForm = this.fb.group({
      duration: ['4', Validators.required],
      plan: ['', Validators.required],
    });

    this.travelerDetailsForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+254[17]\d{8}$/)]],
      numTravelers: [1, [Validators.required, Validators.min(1)]],
      winterSports: [false],
      // UPDATED: Added duplicateTravelerValidator to the FormArray
      travelers: this.fb.array([], [Validators.required, Validators.minLength(1), duplicateTravelerValidator])
    });
  }

  get qf() { return this.quoteForm.controls; }
  get tdf() { return this.travelerDetailsForm.controls; }
  get travelers() { return this.travelerDetailsForm.get('travelers') as FormArray; }

  ngOnInit(): void {
    this.initializePlans();
    this.displayedPlans = this.allTravelPlans;
    this.updatePlanPrices(this.qf.duration.value);
    
    this.quoteForm.valueChanges.pipe(takeUntil(this.unsubscribe$), debounceTime(50)).subscribe(values => this.updatePlanPrices(values.duration));
    
    this.tdf.numTravelers.valueChanges.pipe(takeUntil(this.unsubscribe$), startWith(this.tdf.numTravelers.value)).subscribe(count => {
        if(count > 0 && this.travelers.length !== count) this.updateTravelersArray(count);
    });

    this.travelerDetailsForm.valueChanges.pipe(takeUntil(this.unsubscribe$), debounceTime(300)).subscribe(() => {
        if (this.currentStep > 1) this.calculatePremium();
    });
  }

  ngOnDestroy(): void { this.unsubscribe$.next(); this.unsubscribe$.complete(); }
  
  createTravelerGroup(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required, fullNameValidator]],
      dob: ['', [Validators.required, dobValidator]]
    });
  }

  updateTravelersArray(count: number): void {
      while (this.travelers.length < count) this.travelers.push(this.createTravelerGroup());
      while (this.travelers.length > count) this.travelers.removeAt(this.travelers.length - 1);
  }

  updatePlanPrices(duration: string): void {
    if (!duration) { this.displayedPlans.forEach(plan => plan.priceUSD = 0); return; };
    const ratesForDuration = this.standardRates[duration];
    if (ratesForDuration) this.displayedPlans.forEach(plan => { plan.priceUSD = ratesForDuration[plan.id] || 0; });
  }
  
  calculatePremium(): void {
    this.selectedPlanDetails = this.allTravelPlans.find(p => p.id === this.qf.plan.value) || null;
    if (this.quoteForm.invalid || this.travelerDetailsForm.invalid || !this.selectedPlanDetails) {
      this.premium = this.resetPremium(); return;
    }

    const formValue = this.travelerDetailsForm.getRawValue();
    const baseRateUSD = this.selectedPlanDetails.priceUSD || 0;
    let subtotalUSD = baseRateUSD * formValue.numTravelers;
    
    let groupDiscountPercentage = 0;
    const num = formValue.numTravelers;
    if (num >= 10 && num <= 20) groupDiscountPercentage = 5; else if (num >= 21) groupDiscountPercentage = 10;
    const groupDiscountUSD = subtotalUSD * (groupDiscountPercentage / 100);

    let totalAgeSurchargeUSD = 0;
    formValue.travelers.forEach(traveler => {
        const age = this.getAge(traveler.dob);
        if (age !== null) {
            let percentage = 0;
            if (age < 18) percentage = -50;
            else if (age >= 66 && age <= 75) percentage = 50;
            else if (age >= 76 && age <= 80) percentage = 100;
            else if (age >= 81) percentage = 300;
            totalAgeSurchargeUSD += (baseRateUSD * (percentage / 100));
        }
    });
    const ageSurchargeUSD = totalAgeSurchargeUSD;
    
    const winterSportsSurchargeUSD = formValue.winterSports ? subtotalUSD : 0;
    const totalPayableUSD = subtotalUSD - groupDiscountUSD + ageSurchargeUSD + winterSportsSurchargeUSD;
    
    this.premium = {
      baseRateUSD, subtotalUSD, groupDiscountUSD, ageSurchargeUSD, winterSportsSurchargeUSD, totalPayableUSD,
      totalPayableKES: totalPayableUSD * this.USD_TO_KES_RATE, groupDiscountPercentage
    };
  }

  nextStep(): void { 
    if (this.currentStep === 1 && this.quoteForm.invalid) { this.quoteForm.markAllAsTouched(); return; }
    if (this.currentStep === 2 && this.travelerDetailsForm.invalid) { this.travelerDetailsForm.markAllAsTouched(); return; }
    if (this.currentStep < 3) {
      this.calculatePremium();
      if (this.currentStep === 2) this.saveQuoteToLocalStorage();
      this.currentStep++;
    } 
  }
  
  prevStep(): void { if (this.currentStep > 1) this.currentStep--; }

  saveQuoteToLocalStorage(): void {
    if (this.travelerDetailsForm.invalid || !this.selectedPlanDetails) return;
    this.travelQuoteService.saveQuote({
        planDetails: { name: this.selectedPlanDetails.name, duration: this.getDurationText(this.qf.duration.value) },
        travelerDetails: this.travelerDetailsForm.value,
        premiumSummary: this.premium
    });
  }

  handlePayment(): void {
    if (this.travelerDetailsForm.invalid) return;
    this.authService.check().pipe(take(1)).subscribe(isAuthenticated => {
      if (isAuthenticated) { this.openPaymentDialog(); } else { this.router.navigate(['/']); }
    });
  }

  private openPaymentDialog(): void {
    const dialogRef = this.dialog.open(MpesaPaymentModalComponent, {
      data: { amount: this.premium.totalPayableKES, phoneNumber: this.tdf.phoneNumber.value, reference: `FID-TRV-${Date.now()}`, description: `${this.selectedPlanDetails?.name} Cover` }
    });
    dialogRef.afterClosed().subscribe((result: PaymentResult | null) => { if (result?.success) this.router.navigate(['/dashboard']); });
  }
  
  // NEW: Helper function to calculate age for the template
  getAge(dob: string | null): number | null {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null; // Invalid date
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  }

  getDurationText(value: string): string { return this.standardDurations.find(d => d.value === value)?.label || 'N/A'; }
  closeForm(): void { this.router.navigate(['/dashboard']); }
  abs(value: number): number { return Math.abs(value); }
  private resetPremium(): Premium { return { baseRateUSD: 0, subtotalUSD: 0, groupDiscountUSD: 0, ageSurchargeUSD: 0, winterSportsSurchargeUSD: 0, totalPayableUSD: 0, totalPayableKES: 0, groupDiscountPercentage: 0 }; }

  private initializePlans(): void {
    this.allTravelPlans = [
      { id: 'WW_BASIC', name: 'Worldwide Basic', description: 'Basic worldwide cover', type: 'standard', tags: ['Worldwide', 'Basic'], benefits: [{ name: 'Medical Expenses & Hospitalization', included: true, limit: '$125,000' },{ name: 'Medical Excess', included: true, limit: '$30' },{ name: 'Compulsory Quarantine', included: true, limit: '$80 per day', notes: 'Max. 14 days' },{ name: 'Emergency Medical Evacuation', included: true, limit: '$40,000' },{ name: 'Emergency Dental Care', included: true, limit: '$500', notes: 'Excess $25' },{ name: 'Repatriation of Mortal Remains', included: true, limit: '$10,000' },] },
      { id: 'WW_PLUS', name: 'Worldwide Plus', description: 'Comprehensive worldwide travel', type: 'standard', tags: ['Worldwide', 'Comprehensive'], isMostPopular: true, benefits: [{ name: 'Medical Expenses & Hospitalization', included: true, limit: '$250,000' },{ name: 'Medical Excess', included: true, limit: '$30' },{ name: 'Compulsory Quarantine', included: true, limit: '$80 per day', notes: 'Max. 14 days' },{ name: 'Emergency Medical Evacuation', included: true, limit: '$75,000' },{ name: 'Emergency Dental Care', included: true, limit: '$650', notes: 'Excess $25' },{ name: 'Repatriation of Mortal Remains', included: true, limit: '$15,000' },] },
      { id: 'WW_EXTRA', name: 'Worldwide Extra', description: 'Extra protection whilst travelling', type: 'standard', tags: ['Worldwide', 'Extra Protection'], benefits: [{ name: 'Medical Expenses & Hospitalization', included: true, limit: '$500,000' },{ name: 'Medical Excess', included: true, limit: '$30' },{ name: 'Compulsory Quarantine', included: true, limit: '$80 per day', notes: 'Max. 14 days' },{ name: 'Emergency Medical Evacuation', included: true, limit: '$150,000' },{ name: 'Emergency Dental Care', included: true, limit: '$650', notes: 'Excess $25' },{ name: 'Repatriation of Mortal Remains', included: true, limit: '$15,000' },] },
    ];
  }
}