import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// --- ENUMS ---
export enum TravelProductType {
  TRAVEL_PROTECT = 'Travel Protect',
  STUDENT = 'Student',
  PILGRIMAGE = 'Pilgrimage',
  CORPORATE = 'Corporate',
  DOMESTIC = 'Domestic',
  INBOUND = 'Inbound'
}

export enum QuoteStep {
  PRODUCT_SELECTION = 1,
  PLAN_SELECTION = 2,
  TRAVELER_DETAILS = 3,
  REVIEW_PAYMENT = 4
}

// --- INTERFACES ---
export interface TravelProduct {
  type: TravelProductType;
  title: string;
  description: string;
  icon: string;
  features: string[];
  startingPrice: number;
  currency: string;
  popular?: boolean;
  plans: TravelPlan[];
}

export interface TravelPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  benefits: { [key: string]: string };
  popular?: boolean;
  color: string;
}

export interface TravelerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  passportNumber: string;
  nationality: string;
  placeOfOrigin: string;
  destination: string;
  travelPurpose: string;
  departureDate: string;
  returnDate: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface ValidationErrors {
  [key: string]: string[];
}

@Component({
  selector: 'app-travel-quote',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './travel-quote.component.html',
  styleUrls: ['./travel-quote.component.scss'],
})
export class TravelQuoteComponent implements OnInit {
  // --- ENUMS FOR TEMPLATE ---
  readonly TravelProductType = TravelProductType;
  readonly QuoteStep = QuoteStep;

  // --- STATE MANAGEMENT ---
  state = {
    currentStep: QuoteStep.PRODUCT_SELECTION,
    selectedProduct: null as TravelProduct | null,
    selectedPlan: null as TravelPlan | null,
    isLoading: false,
    hasErrors: false,
    showPaymentModal: false,
    showBenefitsModal: false,
    isLoggedIn: false 
  };
  
  planForModal: TravelPlan | null = null;

  // --- HOVER STATE ---
  hoveredBenefit: string | null = null;
  tooltipX = 0;
  tooltipY = 0;

  // --- TRAVELER DETAILS ---
  travelerDetails: TravelerDetails = {
    firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', passportNumber: '', nationality: 'Kenya', placeOfOrigin: 'Kenya', destination: '', travelPurpose: '', departureDate: '', returnDate: '',
    emergencyContact: { name: '', phone: '', relationship: '' }
  };
  
  // --- DATE VALIDATION ---
  minDepartureDate: string;
  maxDepartureDate: string;
  minReturnDate: string;

  // --- VALIDATION ---
  validationErrors: ValidationErrors = {};

  // --- SEARCHABLE DROPDOWN PROPERTIES ---
  destinationSearch: string = '';
  showDestinationDropdown: boolean = false;
  filteredDestinationCountries: string[] = [];

  // --- DATA ---
  travelProducts: TravelProduct[] = [
    {
      type: TravelProductType.TRAVEL_PROTECT,
      title: 'Travel Protect',
      description: 'Comprehensive international travel insurance with medical coverage, emergency assistance, and trip protection. Premiums vary based on the duration of your trip.',
      icon: 'globe',
      features: [],
      startingPrice: 1274.94,
      currency: 'KES',
      popular: true,
      plans: [
        {
          id: 'africa', name: 'Africa', description: 'Value offer for travelers within Africa or Asia.', price: 1274.94, currency: 'KES', duration: 'Up to 4 days', color: '#04b2e1',
          benefits: { 'Medical Expenses & Hospitalization Abroad': '$15,000', 'Medical Excess': '$30 (Out-Patient)', 'Compulsory Quarantine (COVID-19)': '$80 per day - max. 14 days', 'Emergency Medical Evacuation': '$15,000', 'Emergency Dental Care': '$100 (Excess $25)', 'Repatriation of Mortal Remains': '$10,000', 'Repatriation of Family Member': '$1,500', 'Loss of Passport/Driving License/ID': '$500', 'Compensation for In-flight Loss of Baggage': '$1,500 (Excess $50)', 'Luggage Delay': '$250 (Excess 4 hours)', 'Accidental Death (Public Transport)': '$7,000' }
        },
        {
          id: 'asia', name: 'Asia', description: 'Value offer for travelers within Asia or Africa.', price: 1274.94, currency: 'KES', duration: 'Up to 4 days', color: '#04b2e1',
          benefits: { 'Medical Expenses & Hospitalization Abroad': '$15,000', 'Medical Excess': '$30 (Out-Patient)', 'Compulsory Quarantine (COVID-19)': '$80 per day - max. 14 days', 'Emergency Medical Evacuation': '$15,000', 'Emergency Dental Care': '$100 (Excess $25)', 'Repatriation of Mortal Remains': '$10,000', 'Repatriation of Family Member': '$1,500', 'Loss of Passport/Driving License/ID': '$500', 'Compensation for In-flight Loss of Baggage': '$1,500 (Excess $50)', 'Luggage Delay': '$250 (Excess 4 hours)', 'Accidental Death (Public Transport)': '$7,000' }
        },
        {
          id: 'europe_basic', name: 'Europe Basic', description: 'Value offer for travelers to Europe with limits in Euros.', price: 1518.49, currency: 'KES', duration: 'Up to 4 days', color: '#21275c',
          benefits: { 'Medical Expenses & Hospitalization Abroad': '36,000 €', 'Medical Excess': '30€ (Out-Patient)', 'Compulsory Quarantine (COVID-19)': '80€ per day - max. 14 days', 'Emergency Medical Evacuation': '36,000 €', 'Emergency Dental Care': '100€ (Excess 25€)', 'Repatriation of Mortal Remains': '10,000 €', 'Repatriation of Family Member': '1,500 €', 'Loss of Passport/Driving License/ID': '500 €', 'Compensation for In-flight Loss of Baggage': '1,500 € (Excess 50€)', 'Luggage Delay': '250€ (Excess 4 hours)', 'Accidental Death (Public Transport)': '10,000 €' }
        },
        {
          id: 'worldwide_basic', name: 'Worldwide Basic', description: 'Basic worldwide coverage with comprehensive protection.', price: 2566.97, currency: 'KES', duration: 'Up to 4 days', color: '#04b2e1', popular: true,
          benefits: { 'Medical Expenses & Hospitalization Abroad': '$125,000', 'Medical Excess': '$30 (Out-Patient)', 'Compulsory Quarantine (COVID-19)': '$80 per day - max. 14 days', 'Emergency Medical Evacuation': '$40,000', 'Emergency Dental Care': '$500 (Excess $25)', 'Repatriation of Mortal Remains': '$10,000', 'Compassionate Emergency Visit': 'Return tickets in Economy Class & $100/day max 10 days', 'Daily Hospital Cash Benefit': '$35/day max $350', 'Loss of Passport/Driving License/ID': '$500', 'Compensation for In-flight Loss of Baggage': '$1,500 (Excess $50)', 'Luggage Delay': '$250 (Excess 4 hours)', 'Accidental Death (Public Transport)': '$200,000', 'Personal Civil Liability': '$300,000', 'Advance of Bail Bond': '$3,000', 'Legal Defense Abroad': '$3,500', 'Journey Cancellation': '$2,000', 'Journey Curtailment': '$2,000', 'Hijack in means of public transport': '$50 per day max $5,000' }
        },
        {
          id: 'worldwide_plus', name: 'Worldwide Plus', description: 'Comprehensive worldwide travel with enhanced benefits.', price: 2902.07, currency: 'KES', duration: 'Up to 4 days', color: '#21275c',
          benefits: { 'Medical Expenses & Hospitalization Abroad': '$250,000', 'Medical Excess': '$30 (Out-Patient)', 'Compulsory Quarantine (COVID-19)': '$80 per day - max. 14 days', 'Emergency Medical Evacuation': '$75,000', 'Emergency Dental Care': '$650 (Excess $25)', 'Repatriation of Mortal Remains': '$15,000', 'Compassionate Emergency Visit': 'Return tickets in Economy Class & $200/day max 10 days', 'Daily Hospital Cash Benefit': '$50/day max $500', 'Loss of Passport/Driving License/ID': '$500', 'Compensation for In-flight Loss of Baggage': '$2,000 (Excess $50)', 'Luggage Delay': '$250 (Excess 4 hours)', 'Accidental Death (Public Transport)': '$200,000', 'Personal Civil Liability': '$300,000', 'Advance of Bail Bond': '$10,000', 'Legal Defense Abroad': '$5,000', 'Journey Cancellation': '$3,000', 'Journey Curtailment': '$2,500', 'Hijack in means of public transport': '$100 per day max $7,500' }
        },
        {
          id: 'worldwide_extra', name: 'Worldwide Extra', description: 'Extra protection whilst traveling worldwide.', price: 3271.71, currency: 'KES', duration: 'Up to 4 days', color: '#04b2e1',
          benefits: { 'Medical Expenses & Hospitalization Abroad': '$500,000', 'Medical Excess': '$30 (Out-Patient)', 'Compulsory Quarantine (COVID-19)': '$80 per day - max. 14 days', 'Emergency Medical Evacuation': '$150,000', 'Emergency Dental Care': '$650 (Excess $25)', 'Repatriation of Mortal Remains': '$15,000', 'Compassionate Emergency Visit': 'Return tickets in Economy Class & $200/day max 10 days', 'Daily Hospital Cash Benefit': '$50/day max $500', 'Loss of Passport/Driving License/ID': '$500', 'Compensation for In-flight Loss of Baggage': '$2,000 (Excess $50)', 'Luggage Delay': '$250 (Excess 4 hours)', 'Accidental Death (Public Transport)': '$300,000', 'Personal Civil Liability': '$300,000', 'Advance of Bail Bond': '$10,000', 'Legal Defense Abroad': '$5,000', 'Journey Cancellation': '$3,000', 'Journey Curtailment': '$2,500', 'Hijack in means of public transport': '$100 per day max $7,500' }
        },
        {
          id: 'europe_plus', name: 'Europe Plus', description: 'Value offer for travelers to Europe with enhanced coverage.', price: 2109.23, currency: 'KES', duration: 'Up to 4 days', color: '#21275c',
          benefits: { 'Medical Expenses & Hospitalization Abroad': '$80,000', 'Medical Excess': '$30 (Out-Patient)', 'Compulsory Quarantine (COVID-19)': '$80 per day - max. 14 days', 'Emergency Medical Evacuation': '$80,000', 'Emergency Dental Care': '$450 (Excess $25)', 'Repatriation of Mortal Remains': '$10,000', 'Compassionate Emergency Visit': 'Return tickets in Economy Class & $100/day max 10 days', 'Daily Hospital Cash Benefit': '$35/day max $350', 'Loss of Passport/Driving License/ID': '$500', 'Compensation for In-flight Loss of Baggage': '$1,500 (Excess $50)', 'Luggage Delay': '$250 (Excess 4 hours)', 'Accidental Death (Public Transport)': '$75,000', 'Personal Civil Liability': '$100,000', 'Advance of Bail Bond': '$3,000', 'Legal Defense Abroad': '$3,500', 'Journey Cancellation': '$1,500', 'Journey Curtailment': '$1,500', 'Hijack in means of public transport': '$50 per day max $5,000' }
        }
      ]
    },
    {
      type: TravelProductType.STUDENT,
      title: 'Student Travel',
      description: 'Specially designed long-term travel insurance for students studying abroad. Premiums are available for 6, 9, and 12-month periods.',
      icon: 'student',
      features: [],
      startingPrice: 49910.94,
      currency: 'KES',
      plans: [
        {
          id: 'students_classic', name: 'Students Classic', description: 'Essential coverage for students abroad.', price: 49910.94, currency: 'KES', duration: '6 months maximum (180 consecutive days)', color: '#04b2e1',
          benefits: { 'Medical Expenses & Hospitalization': '$60,000 (Excess $70)', 'Emergency Medical Evacuation': '$30,000', 'Emergency Dental Care': '$500 (Excess $70)', 'Repatriation of Mortal Remains': '$15,000', 'Emergency Return Home': '$2,000', 'Personal Liability': '$50,000 (Excess $150)', 'Loss of Passport/ID': '$300', 'Legal Defense': '$2,000', 'Advance of Bail Bond': '$15,000', 'Winter Sports': 'Available as option' }
        },
        {
          id: 'students_premium', name: 'Students Premium', description: 'Enhanced coverage for students with higher limits.', price: 61236.95, currency: 'KES', duration: '6 months maximum (180 consecutive days)', color: '#21275c', popular: true,
          benefits: { 'Medical Expenses & Hospitalization': '$100,000 (Excess $70)', 'Emergency Medical Evacuation': '$50,000', 'Emergency Dental Care': '$500 (Excess $70)', 'Repatriation of Mortal Remains': '$25,000', 'Emergency Return Home': '$2,000', 'Personal Liability': '$50,000 (Excess $150)', 'Loss of Passport/ID': '$300', 'Legal Defense': '$2,000', 'Advance of Bail Bond': '$20,000', 'Winter Sports': 'Available as option' }
        }
      ]
    },
    {
      type: TravelProductType.PILGRIMAGE,
      title: 'Pilgrimage Travel',
      description: 'Specialized coverage for religious pilgrimage journeys. Applicable for all religions, except those holy places located in Europe (Schengen cover is mandatory).',
      icon: 'pilgrimage',
      features: [],
      startingPrice: 2470.24,
      currency: 'KES',
      plans: [
        {
          id: 'pilgrimage_basic', name: 'Pilgrimage Basic', description: 'Essential coverage for pilgrimage journeys.', price: 2470.24, currency: 'KES', duration: '1-15 days', color: '#04b2e1',
          benefits: { 'Medical Expenses & Hospitalization Abroad': 'USD 10,000', 'Emergency Medical Evacuation': 'USD 15,000', 'Repatriation of Mortal Remains': 'USD 5,000', '24 Hours Assistance Services': 'Unlimited', 'Advance of Funds': 'USD 250', 'Compensation for In-flight Loss of Baggage': 'USD 250', 'Cover in case of War & Terrorism': 'Included' }
        },
        {
          id: 'pilgrimage_plus', name: 'Pilgrimage Plus', description: 'Enhanced pilgrimage coverage with higher limits.', price: 2815.70, currency: 'KES', duration: '1-15 days', color: '#21275c',
          benefits: { 'Medical Expenses & Hospitalization Abroad': 'USD 15,000', 'Emergency Medical Evacuation': 'USD 15,000', 'Repatriation of Mortal Remains': 'USD 10,000', '24 Hours Assistance Services': 'Unlimited', 'Advance of Funds': 'USD 500', 'Compensation for In-flight Loss of Baggage': 'USD 500', 'Cover in case of War & Terrorism': 'Included' }
        },
        {
          id: 'pilgrimage_extra', name: 'Pilgrimage Extra', description: 'Premium pilgrimage coverage with maximum protection.', price: 3679.36, currency: 'KES', duration: '1-15 days', color: '#04b2e1', popular: true,
          benefits: { 'Medical Expenses & Hospitalization Abroad': 'USD 25,000', 'Emergency Medical Evacuation': 'USD 15,000', 'Repatriation of Mortal Remains': 'USD 15,000', '24 Hours Assistance Services': 'Unlimited', 'Advance of Funds': 'USD 750', 'Compensation for In-flight Loss of Baggage': 'USD 750', 'Cover in case of War & Terrorism': 'Included' }
        }
      ]
    },
    {
      type: TravelProductType.CORPORATE,
      title: 'Corporate Travel',
      description: 'Premium business travel insurance for corporate executives and employees.',
      icon: 'corporate',
      features: [],
      startingPrice: 179511.37,
      currency: 'KES',
      plans: [
        { id: 'corp_200', name: '200 Days/Year', description: 'Annual premium for corporate travel.', price: 179511.37, currency: 'KES', duration: 'Annual Premium', color: '#04b2e1', benefits: { 'Excess Day Rate': 'KES 960.57' } },
        { id: 'corp_500', name: '500 Days/Year', description: 'Annual premium for corporate travel.', price: 305513.81, currency: 'KES', duration: 'Annual Premium', color: '#21275c', benefits: { 'Excess Day Rate': 'KES 779.20' } },
        { id: 'corp_600', name: '600 Days/Year', description: 'Annual premium for corporate travel.', price: 410244.36, currency: 'KES', duration: 'Annual Premium', color: '#04b2e1', benefits: { 'Excess Day Rate': 'KES 779.20' } },
        { id: 'corp_800', name: '800 Days/Year', description: 'Annual premium for corporate travel.', price: 515883.48, currency: 'KES', duration: 'Annual Premium', color: '#21275c', benefits: { 'Excess Day Rate': 'KES 779.20' } },
        { id: 'corp_1000', name: '1000 Days/Year', description: 'Annual premium for corporate travel.', price: 572247.49, currency: 'KES', duration: 'Annual Premium', color: '#04b2e1', benefits: { 'Excess Day Rate': 'KES 597.83' } },
        { id: 'corp_1500', name: '1500 Days/Year', description: 'Annual premium for corporate travel.', price: 836436.83, currency: 'KES', duration: 'Annual Premium', color: '#21275c', benefits: { 'Excess Day Rate': 'KES 597.83' } },
        { id: 'corp_2000', name: '2000 Days/Year', description: 'Annual premium for corporate travel.', price: 857411.62, currency: 'KES', duration: 'Annual Premium', color: '#04b2e1', benefits: { 'Excess Day Rate': 'KES 594.38' } },
        { id: 'corp_5000', name: '5000 Days/Year', description: 'Annual premium for corporate travel.', price: 913775.63, currency: 'KES', duration: 'Annual Premium', color: '#21275c', benefits: { 'Excess Day Rate': 'KES 551.19' } }
      ]
    },
    {
      type: TravelProductType.DOMESTIC,
      title: 'Domestic Travel',
      description: 'Protection for travel within Kenya, covering medical emergencies and trip disruptions. Daily premium varies by trip duration.',
      icon: 'domestic',
      features: [],
      startingPrice: 126.66,
      currency: 'KES',
      plans: [
        { id: 'domestic_1_8', name: '1 - 8 Days', description: 'Standard domestic coverage for short trips.', price: 199.20, currency: 'KES', duration: 'Total Premium Per Day', color: '#04b2e1', benefits: { 'Medical Expenses': '$5,000', 'Medical Transportation/Repatriation': '$3,000', 'Emergency Dental Expenses': '$350', 'Transport of Deceased': '$3,000', 'Personal Accident (Transport)': '$7,000', 'Baggage Loss/Damage': '$300', 'Trip Cancellation': '$500 (Excess $50)', 'Hijack Coverage': '$30 per day max $3,000' } },
        { id: 'domestic_9_14', name: '9 - 14 Days', description: 'Standard domestic coverage for medium trips.', price: 186.77, currency: 'KES', duration: 'Total Premium Per Day', color: '#21275c', benefits: { 'Medical Expenses': '$5,000', 'Medical Transportation/Repatriation': '$3,000', 'Emergency Dental Expenses': '$350', 'Transport of Deceased': '$3,000', 'Personal Accident (Transport)': '$7,000', 'Baggage Loss/Damage': '$300', 'Trip Cancellation': '$500 (Excess $50)', 'Hijack Coverage': '$30 per day max $3,000' } },
        { id: 'domestic_15_21', name: '15 - 21 Days', description: 'Standard domestic coverage for extended trips.', price: 174.33, currency: 'KES', duration: 'Total Premium Per Day', color: '#04b2e1', benefits: { 'Medical Expenses': '$5,000', 'Medical Transportation/Repatriation': '$3,000', 'Emergency Dental Expenses': '$350', 'Transport of Deceased': '$3,000', 'Personal Accident (Transport)': '$7,000', 'Baggage Loss/Damage': '$300', 'Trip Cancellation': '$500 (Excess $50)', 'Hijack Coverage': '$30 per day max $3,000' } },
        { id: 'domestic_22_32', name: '22 - 32 Days', description: 'Standard domestic coverage for longer trips.', price: 163.97, currency: 'KES', duration: 'Total Premium Per Day', color: '#21275c', benefits: { 'Medical Expenses': '$5,000', 'Medical Transportation/Repatriation': '$3,000', 'Emergency Dental Expenses': '$350', 'Transport of Deceased': '$3,000', 'Personal Accident (Transport)': '$7,000', 'Baggage Loss/Damage': '$300', 'Trip Cancellation': '$500 (Excess $50)', 'Hijack Coverage': '$30 per day max $3,000' } },
        { id: 'domestic_33_49', name: '33 - 49 Days', description: 'Standard domestic coverage for extended stays.', price: 151.53, currency: 'KES', duration: 'Total Premium Per Day', color: '#04b2e1', benefits: { 'Medical Expenses': '$5,000', 'Medical Transportation/Repatriation': '$3,000', 'Emergency Dental Expenses': '$350', 'Transport of Deceased': '$3,000', 'Personal Accident (Transport)': '$7,000', 'Baggage Loss/Damage': '$300', 'Trip Cancellation': '$500 (Excess $50)', 'Hijack Coverage': '$30 per day max $3,000' } },
        { id: 'domestic_50_62', name: '50 - 62 Days', description: 'Standard domestic coverage for long stays.', price: 139.09, currency: 'KES', duration: 'Total Premium Per Day', color: '#21275c', benefits: { 'Medical Expenses': '$5,000', 'Medical Transportation/Repatriation': '$3,000', 'Emergency Dental Expenses': '$350', 'Transport of Deceased': '$3,000', 'Personal Accident (Transport)': '$7,000', 'Baggage Loss/Damage': '$300', 'Trip Cancellation': '$500 (Excess $50)', 'Hijack Coverage': '$30 per day max $3,000' } },
        { id: 'domestic_63_92', name: '63 - 92 Days', description: 'Standard domestic coverage for very long stays.', price: 126.66, currency: 'KES', duration: 'Total Premium Per Day', color: '#04b2e1', benefits: { 'Medical Expenses': '$5,000', 'Medical Transportation/Repatriation': '$3,000', 'Emergency Dental Expenses': '$350', 'Transport of Deceased': '$3,000', 'Personal Accident (Transport)': '$7,000', 'Baggage Loss/Damage': '$300', 'Trip Cancellation': '$500 (Excess $50)', 'Hijack Coverage': '$30 per day max $3,0_00' } }
      ]
    },
    {
      type: TravelProductType.INBOUND,
      title: 'Inbound Visitor',
      description: 'Comprehensive coverage for international visitors traveling to Kenya. Premiums vary based on the duration of stay.',
      icon: 'inbound',
      features: [],
      startingPrice: 3563.63,
      currency: 'KES',
      plans: [
        { id: 'inbound_7', name: 'Up to 7 Days', description: 'Total premium for the coverage period.', price: 3563.63, currency: 'KES', duration: 'Up to 7 Days', color: '#04b2e1', benefits: {'Medical Expenses & Hospitalization': '$130,000', 'Medical Transportation/Repatriation': '$130,000', 'Emergency Dental Care': '$1,000 (Excess $60)','Repatriation of Mortal Remains': 'Actual cost', 'Personal Accident (24 hours)': '$30,000', 'Baggage Delay Compensation': '$200', 'Legal Defense Abroad': '$3,000','Advance of Bail Bond': '$20,000', 'Trip Cancellation/Curtailment': '$2,000 (Excess $200)'} },
        { id: 'inbound_10', name: 'Up to 10 Days', description: 'Total premium for the coverage period.', price: 5018.03, currency: 'KES', duration: 'Up to 10 Days', color: '#21275c', benefits: {'Medical Expenses & Hospitalization': '$130,000', 'Medical Transportation/Repatriation': '$130,000', 'Emergency Dental Care': '$1,000 (Excess $60)','Repatriation of Mortal Remains': 'Actual cost', 'Personal Accident (24 hours)': '$30,000', 'Baggage Delay Compensation': '$200', 'Legal Defense Abroad': '$3,000','Advance of Bail Bond': '$20,000', 'Trip Cancellation/Curtailment': '$2,000 (Excess $200)'} },
        { id: 'inbound_15', name: 'Up to 15 Days', description: 'Total premium for the coverage period.', price: 5366.95, currency: 'KES', duration: 'Up to 15 Days', color: '#04b2e1', benefits: {'Medical Expenses & Hospitalization': '$130,000', 'Medical Transportation/Repatriation': '$130,000', 'Emergency Dental Care': '$1,000 (Excess $60)','Repatriation of Mortal Remains': 'Actual cost', 'Personal Accident (24 hours)': '$30,000', 'Baggage Delay Compensation': '$200', 'Legal Defense Abroad': '$3,000','Advance of Bail Bond': '$20,000', 'Trip Cancellation/Curtailment': '$2,000 (Excess $200)'} },
        { id: 'inbound_21', name: 'Up to 21 Days', description: 'Total premium for the coverage period.', price: 5589.77, currency: 'KES', duration: 'Up to 21 Days', color: '#21275c', benefits: {'Medical Expenses & Hospitalization': '$130,000', 'Medical Transportation/Repatriation': '$130,000', 'Emergency Dental Care': '$1,000 (Excess $60)','Repatriation of Mortal Remains': 'Actual cost', 'Personal Accident (24 hours)': '$30,000', 'Baggage Delay Compensation': '$200', 'Legal Defense Abroad': '$3,000','Advance of Bail Bond': '$20,000', 'Trip Cancellation/Curtailment': '$2,000 (Excess $200)'} },
        { id: 'inbound_31', name: 'Up to 31 Days', description: 'Total premium for the coverage period.', price: 8840.58, currency: 'KES', duration: 'Up to 31 Days', color: '#04b2e1', benefits: {'Medical Expenses & Hospitalization': '$130,000', 'Medical Transportation/Repatriation': '$130,000', 'Emergency Dental Care': '$1,000 (Excess $60)','Repatriation of Mortal Remains': 'Actual cost', 'Personal Accident (24 hours)': '$30,000', 'Baggage Delay Compensation': '$200', 'Legal Defense Abroad': '$3,000','Advance of Bail Bond': '$20,000', 'Trip Cancellation/Curtailment': '$2,000 (Excess $200)'} },
        { id: 'inbound_62', name: 'Up to 62 Days', description: 'Total premium for the coverage period.', price: 13226.23, currency: 'KES', duration: 'Up to 62 Days', color: '#21275c', benefits: {'Medical Expenses & Hospitalization': '$130,000', 'Medical Transportation/Repatriation': '$130,000', 'Emergency Dental Care': '$1,000 (Excess $60)','Repatriation of Mortal Remains': 'Actual cost', 'Personal Accident (24 hours)': '$30,000', 'Baggage Delay Compensation': '$200', 'Legal Defense Abroad': '$3,000','Advance of Bail Bond': '$20,000', 'Trip Cancellation/Curtailment': '$2,000 (Excess $200)'} },
        { id: 'inbound_92', name: 'Up to 92 Days', description: 'Total premium for the coverage period.', price: 16939.96, currency: 'KES', duration: 'Up to 92 Days', color: '#04b2e1', benefits: {'Medical Expenses & Hospitalization': '$130,000', 'Medical Transportation/Repatriation': '$130,000', 'Emergency Dental Care': '$1,000 (Excess $60)','Repatriation of Mortal Remains': 'Actual cost', 'Personal Accident (24 hours)': '$30,000', 'Baggage Delay Compensation': '$200', 'Legal Defense Abroad': '$3,000','Advance of Bail Bond': '$20,000', 'Trip Cancellation/Curtailment': '$2,000 (Excess $200)'} },
        { id: 'inbound_180', name: 'Up to 180 Days', description: '180 consecutive days per trip.', price: 19012.73, currency: 'KES', duration: 'Up to 180 Days', color: '#21275c', benefits: {'Medical Expenses & Hospitalization': '$130,000', 'Medical Transportation/Repatriation': '$130,000', 'Emergency Dental Care': '$1,000 (Excess $60)','Repatriation of Mortal Remains': 'Actual cost', 'Personal Accident (24 hours)': '$30,000', 'Baggage Delay Compensation': '$200', 'Legal Defense Abroad': '$3,000','Advance of Bail Bond': '$20,000', 'Trip Cancellation/Curtailment': '$2,000 (Excess $200)'} },
        { id: 'inbound_365', name: '1 Year Multi-Trip', description: '180 consecutive days per trip.', price: 24431.32, currency: 'KES', duration: '1 Year Multi-Trip', color: '#04b2e1', benefits: {'Medical Expenses & Hospitalization': '$130,000', 'Medical Transportation/Repatriation': '$130,000', 'Emergency Dental Care': '$1,000 (Excess $60)','Repatriation of Mortal Remains': 'Actual cost', 'Personal Accident (24 hours)': '$30,000', 'Baggage Delay Compensation': '$200', 'Legal Defense Abroad': '$3,000','Advance of Bail Bond': '$20,000', 'Trip Cancellation/Curtailment': '$2,000 (Excess $200)'} }
      ]
    }
  ];

  benefitDescriptions: { [key: string]: string } = {
    'Medical Expenses & Hospitalization Abroad': 'Coverage for medical treatment, hospitalization, and emergency medical expenses, including COVID-19.',
    'Medical Expenses & Hospitalization': 'Coverage for medical treatment, hospitalization, and emergency medical expenses.',
    'Medical Expenses': 'Coverage for medical treatment and emergency medical expenses within the country of travel.',
    'Emergency Dental Expenses': 'Emergency dental treatment coverage for the relief of pain.',
    'Medical Transportation/Repatriation': 'Emergency medical transportation to an adequate medical facility or repatriation.',
    'Transport of Deceased': 'Covers the cost of transporting the deceased back to their place of residence.',
    'Baggage Loss/Damage': 'Compensation for lost, stolen, or damaged luggage and personal effects.',
    'Medical Excess': 'The out-of-pocket amount you must pay for a claim before the insurance pays.',
    'Compulsory Quarantine (COVID-19)': 'A daily benefit paid if you are forced into a mandatory quarantine due to COVID-19.',
    'Emergency Medical Evacuation': 'Emergency medical transportation to an adequate medical facility or repatriation to your home country.',
    'Emergency Dental Care': 'Emergency dental treatment coverage for the relief of pain.',
    'Repatriation of Mortal Remains': 'Covers the cost of transporting the deceased back to their home country.',
    'Repatriation of Family Member': 'Covers the cost for a family member to travel with the repatriated insured person.',
    'Emergency Return Home': 'Covers the cost of an emergency trip home following the death of a close family member.',
    'Compassionate Emergency Visit': 'Covers travel and accommodation for a family member to visit you if you are hospitalized for an extended period.',
    'Daily Hospital Cash Benefit': 'A fixed daily amount paid to you for each day you are hospitalized.',
    'Personal Accident': 'Coverage for accidental death or permanent disability during your trip.',
    'Personal Accident (Transport)': 'Coverage for accidental death or permanent disability while using specified transport.',
    'Accidental Death (Public Transport)': 'Coverage for accidental death while using public transportation.',
    'Total Disability in Means of public Transport': 'Coverage for total disability resulting from an accident while using public transport.',
    'Baggage Loss Compensation': 'Compensation for lost, stolen, or damaged luggage.',
    'Baggage Delay Compensation': 'Compensation to purchase essential items if your checked-in baggage is delayed.',
    'Compensation for In-flight Loss of Baggage': 'Compensation for the loss of checked-in baggage by an airline.',
    'Loss of Passport': 'Covers the cost of replacing a lost or stolen passport while traveling.',
    'Loss of Passport/Driving License/ID': 'Covers the cost of replacing lost or stolen important documents.',
    'Loss of Passport/ID': 'Covers the cost of replacing lost or stolen identity documents.',
    'Personal Liability': 'Coverage for legal liability to third parties for bodily injury or property damage.',
    'Personal Civil Liability': 'Coverage for legal liability to third parties for accidental bodily injury or property damage.',
    'Legal Defense': 'Coverage for legal expenses.',
    'Legal Defense Abroad': 'Coverage for legal expenses incurred abroad.',
    'Advance of Bail Bond': 'An advance payment to secure your release on bail for a bailable offense.',
    'Trip Cancellation': 'Reimbursement for pre-paid, non-refundable trip expenses if you have to cancel for a covered reason.',
    'Trip Cancellation/Curtailment': 'Covers cancellation or cutting your trip short for covered reasons.',
    'Journey Cancellation': 'Reimbursement for pre-paid, non-refundable trip expenses if you have to cancel for a covered reason.',
    'Journey Curtailment': 'Reimbursement for unused trip expenses if you have to cut your trip short for a covered reason.',
    'Hijack Coverage': 'Provides compensation for each day of a hijacking.',
    'Hijack in means of public transport': 'Provides compensation for each day of a hijacking while on public transport.',
    'War & Terrorism Coverage': 'Coverage for losses arising from acts of war or terrorism.',
    'Cover in case of War & Terrorism': 'Coverage for losses arising from acts of war or terrorism.',
    '24 Hours Assistance Services': 'Access to a 24/7 helpline for travel and medical assistance.',
    'Advance of Funds': 'An emergency cash advance in case of theft or loss of funds.',
    'Business Documents': 'Coverage for the loss of essential business documents.',
    'Delivery of Medicines (Services only)': 'Covers the service of delivering essential medicines, but not the cost of the medicine itself.',
    'Excess Day Rate': 'The additional cost per day for travel that exceeds the allocated man-days in the annual corporate plan.'
  };

  countries = [ 'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea North', 'Korea South', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe' ];

  relationships = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Other'];

  constructor(private router: Router) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.minDepartureDate = today.toISOString().split('T')[0];
    this.maxDepartureDate = tomorrow.toISOString().split('T')[0];
    this.minReturnDate = this.minDepartureDate;
  }

  ngOnInit(): void {
    this.filteredDestinationCountries = [...this.countries];
    this.checkLoginStatus();
    this.updateMinReturnDate();
  }
  
  // --- DATE LOGIC ---
  updateMinReturnDate(): void {
    if (this.travelerDetails.departureDate) {
      const departure = new Date(this.travelerDetails.departureDate);
      departure.setDate(departure.getDate() + 1);
      this.minReturnDate = departure.toISOString().split('T')[0];

      if (this.travelerDetails.returnDate && this.travelerDetails.returnDate < this.minReturnDate) {
        this.travelerDetails.returnDate = '';
      }
    } else {
       const today = new Date();
       today.setDate(today.getDate() + 1);
       this.minReturnDate = today.toISOString().split('T')[0];
    }
  }

  // --- MODAL AND PLAN SELECTION ---
  openBenefitsModal(plan: TravelPlan, event: MouseEvent): void {
    event.stopPropagation();
    this.planForModal = plan;
    this.state.showBenefitsModal = true;
  }

  closeBenefitsModal(): void {
    this.state.showBenefitsModal = false;
    this.planForModal = null;
  }

  selectPlanAndContinue(plan: TravelPlan | null): void {
    if (!plan) return;
    
    this.state.selectedPlan = plan;
    this.closeBenefitsModal();
    this.state.currentStep = QuoteStep.TRAVELER_DETAILS;
  }

  // --- PRODUCT SELECTION ---
  selectProduct(product: TravelProduct): void {
    this.state.selectedProduct = product;
    this.state.currentStep = QuoteStep.PLAN_SELECTION;
  }

  // --- BENEFIT HOVER ---
  onBenefitHover(benefit: string, event: MouseEvent): void {
    this.hoveredBenefit = benefit;
    this.tooltipX = event.clientX + 15;
    this.tooltipY = event.clientY + 15;
  }

  onBenefitLeave(): void {
    this.hoveredBenefit = null;
  }

  getBenefitDescription(benefitKey: string): string {
    const foundKey = Object.keys(this.benefitDescriptions).find(k => benefitKey.toLowerCase().includes(k.toLowerCase()));
    return foundKey ? this.benefitDescriptions[foundKey] : 'Benefit information not available.';
  }

  // --- NAVIGATION ---
  goToStep(step: QuoteStep): void {
    if (step <= this.state.currentStep) {
      this.state.currentStep = step;
    }
  }

  goToPreviousStep(): void {
    if (this.state.currentStep > QuoteStep.PRODUCT_SELECTION) {
      this.state.currentStep--;
    }
  }

  // --- DESTINATION SEARCH ---
  filterDestinationCountries(event: any): void {
    const query = event.target.value.toLowerCase();
    this.destinationSearch = event.target.value;
    this.travelerDetails.destination = event.target.value;
    this.filteredDestinationCountries = this.countries.filter((country) =>
      country.toLowerCase().includes(query),
    );
    this.showDestinationDropdown = true;
  }

  selectDestinationCountry(country: string): void {
    this.travelerDetails.destination = country;
    this.destinationSearch = country;
    this.showDestinationDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.destination-dropdown-container')) {
      this.showDestinationDropdown = false;
    }
  }

  // --- VALIDATION & QUOTE ---
  validateForm(): boolean {
    const errors: string[] = [];
    const details = this.travelerDetails;
    
    if (!details.firstName?.trim()) errors.push('First name is required');
    if (!details.lastName?.trim()) errors.push('Last name is required');
    if (!details.email?.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
      errors.push('Email is invalid');
    }
    if (!details.phone?.trim()) errors.push('Phone number is required');
    if (!details.dateOfBirth) errors.push('Date of birth is required');
    if (!details.passportNumber?.trim()) errors.push('Passport number is required');
    if (!details.destination?.trim() || !this.countries.includes(details.destination)) {
      errors.push('A valid destination is required');
    }
    if (!details.travelPurpose) errors.push('Travel purpose is required');
    if (!details.departureDate) {
        errors.push('Departure date is required');
    } 
    if (!details.returnDate) {
        errors.push('Return date is required');
    }
    
    if (details.departureDate && details.returnDate && details.returnDate <= details.departureDate) {
      errors.push('Return date must be after the departure date');
    }
    
    if (!details.emergencyContact.name?.trim()) errors.push('Emergency contact name is required');
    if (!details.emergencyContact.phone?.trim()) errors.push('Emergency contact phone is required');
    if (!details.emergencyContact.relationship?.trim()) errors.push('Emergency contact relationship is required');
    
    this.validationErrors = errors.length > 0 ? { 'form': errors } : {};
    return errors.length === 0;
  }

  getQuote(): void {
    if (this.validateForm()) {
      this.state.currentStep = QuoteStep.REVIEW_PAYMENT;
    }
  }

  // --- PAYMENT & DOWNLOAD ---
  downloadQuote(): void {
    alert('Your quote is being downloaded...');
    console.log('Downloading quote for:', this.travelerDetails, 'Plan:', this.state.selectedPlan);
  }
  
  proceedToPayment(): void {
    if (this.state.isLoggedIn) {
      this.state.showPaymentModal = true;
    } else {
      this.router.navigate(['/sign-in']);
    }
  }

  private checkLoginStatus(): void {
    this.state.isLoggedIn = false;
  }

  processPayment(): void {
    this.state.isLoading = true;
    
    setTimeout(() => {
      this.state.isLoading = false;
      this.state.showPaymentModal = false;
      alert('Payment successful! Your travel insurance is now active.');
      this.resetForm();
    }, 3000);
  }

  closePaymentModal(): void {
    this.state.showPaymentModal = false;
  }

  private resetForm(): void {
    this.state.currentStep = QuoteStep.PRODUCT_SELECTION;
    this.state.selectedProduct = null;
    this.state.selectedPlan = null;
    this.travelerDetails = {
      firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', passportNumber: '', nationality: 'Kenya', placeOfOrigin: 'Kenya', destination: '', travelPurpose: '', departureDate: '', returnDate: '',
      emergencyContact: { name: '', phone: '', relationship: '' }
    };
    this.destinationSearch = '';
    this.validationErrors = {};
  }

  // --- UTILITY METHODS ---
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  returnToHomepage(): void {
    window.location.href = '/';
  }
}




