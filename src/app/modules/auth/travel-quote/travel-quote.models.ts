export interface TravelQuote {
  id?: string;
  travellingFrom: string;
  travellingTo: string;
  departureDate: Date;
  returnDate: Date;
  numberOfDays: number;
  age: number;
  dateOfBirth: Date;
  travelType: 'Individual' | 'Family' | 'Group';
  reasonForTravel: string;
  referralName?: string;
  referralPhone?: string;
  selectedPlan?: InsurancePlan;
  customer?: Customer;
  premium?: number;
  currency?: string;
  exchangeRate?: number;
}

export interface InsurancePlan {
  name: 'Gold Plan' | 'Premium Outbound';
  benefits: PlanBenefit[];
  totalPremium: number;
  currency: string;
  addOns?: AddOn[];
}

export interface PlanBenefit {
  name: string;
  goldPlan: string | number;
  premiumOutbound: string | number;
}

export interface AddOn {
  name: string;
  selected: boolean;
}

export interface Customer {
  passportNumber: string;
  nationality: string;
  firstName: string;
  otherNames: string;
  dateOfBirth: Date;
  age: number;
  gender: string;
  phoneNumber: string;
  email: string;
  occupation: string;
}