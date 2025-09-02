import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { forkJoin, Subject, takeUntil, debounceTime } from 'rxjs';
import { AuthenticationService, StoredUser } from '../shared/services/auth.service';
import { CargoTypeData, Category, MarineProduct, PackagingType, QuoteResult } from '../../../core/user/user.types';
import { UserService } from '../../../core/user/user.service';
import { ThousandsSeparatorValueAccessor } from '../directives/thousands-separator-value-accessor';
import { QuoteService } from '../shared/services/quote.service';

// --- INTERFACES & VALIDATORS ---

// Custom validator for minimum word count
export function minWords(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) return null;
        const words = control.value.trim().split(/\s+/).length;
        return words < min ? { minWords: { requiredWords: min, actualWords: words } } : null;
    };
}

// Custom validator for maximum word count
export function maxWords(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) return null;
        const words = control.value.trim().split(/\s+/).length;
        return words > max ? { maxWords: { maxWords: max, actualWords: words } } : null;
    };
}

// Custom validator for KRA PIN format
export const kraPinValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const kraPinPattern = /^[A-Z]\d{9}[A-Z]$/i;
    return kraPinPattern.test(control.value) ? null : { invalidKraPin: true };
};

// Custom validator for phone number format
export const phoneNumberValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const phonePattern = /^(07|01)\d{8}$/;
    return phonePattern.test(control.value) ? null : { invalidPhoneNumber: true };
};

// Custom validator for ID number format (5-15 alphanumeric characters)
export const idNumberValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const idPattern = /^[a-zA-Z0-9]{5,15}$/;
    return idPattern.test(control.value) ? null : { invalidIdNumber: true };
};

// Custom validator for IDF number format: 12MBAIM1234567891
export const idfNumberValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const idfPattern = /^\d{2}[A-Z]{5}\d{10}$/i;
    return idfPattern.test(control.value) ? null : { invalidIdfNumber: true };
};

// Custom validator for UCR number format: 12VNP011111123X0012345678
export const ucrNumberValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const ucrPattern = /^\d{2}[A-Z]{3}\d{9}[A-Z]\d{10}$/i;
    return ucrPattern.test(control.value) ? null : { invalidUcrNumber: true };
};

// Custom validator for name fields
export const nameValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const namePattern = /^[a-zA-Z\s'-]+$/;
    return namePattern.test(control.value) ? null : { invalidName: true };
};

// Custom validator to prevent duplicate file uploads in a form group
export const duplicateFileValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup)) {
        return null;
    }
    const files: File[] = Object.values(control.controls)
        .map(ctrl => ctrl.value)
        .filter((value): value is File => value instanceof File && value !== null);

    if (files.length <= 1) {
        return null;
    }

    const fileNames = files.map(file => file.name);
    const uniqueFileNames = new Set(fileNames);

    return fileNames.length !== uniqueFileNames.size ? { duplicateFiles: true } : null;
};

interface PremiumCalculation {
    basePremium: number;
    phcf: number;
    trainingLevy: number;
    stampDuty: number;
    commission: number;
    totalPayable: number;
    currency: string;
}

interface MpesaPayment {
    amount: number;
    phoneNumber: string;
    reference: string;
    description: string;
}

export interface PaymentResult {
    success: boolean;
    method: 'stk' | 'paybill' | 'card';
    reference: string;
    mpesaReceipt?: string;
}

interface DisplayUser {
    type: 'individual' | 'intermediary';
    name: string;
}

// --- TERMS AND PRIVACY POLICY MODAL COMPONENT ---
@Component({
    selector: 'app-terms-privacy-modal',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div class="modal-container">
            <div class="modal-header">
                <h2 mat-dialog-title class="modal-title">{{ data.title }}</h2>
                <button mat-icon-button (click)="closeDialog()" class="close-button" aria-label="Close dialog">
                    <mat-icon>close</mat-icon>
                </button>
            </div>
            <mat-dialog-content class="modal-content">
                <div class="content-text">
                    <h3>Terms of Use and Data Privacy Policy</h3>
                    <p>Geminia Insurance Company Limited is committed to protecting the fundamental human right to privacy of those with whom we interact. We recognize the need to safeguard personal data that is collected or disclosed to us as part of the Know-your-customer information required by us in order to provide you with the requisite financial product or service.</p>
                    <p>We are committed to complying with the requirements of the Data Protection Act and the attendant regulations as well as best global best practices regarding the processing of your personal data. In this regard, you are required to acquaint yourselves with our data privacy statement (<a href="https://geminia.co.ke/data-privacy-statement/" target="_blank" class="policy-link">https://geminia.co.ke/data-privacy-statement/</a>) which is intended to tell you how we use your personal data and describes how we collect and process your personal data during and after your relationship with us.</p>
                </div>
            </mat-dialog-content>
            <div class="modal-footer">
                <button mat-raised-button (click)="closeDialog()" class="accept-button">I Understand</button>
            </div>
        </div>
    `,
    styles: [`
        .modal-container { background-color: white; border-radius: 12px; overflow: hidden; max-width: 600px; max-height: 80vh; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background-color: #21275c; color: white; position: relative; }
        .modal-title { font-size: 18px; font-weight: 600; margin: 0; }
        .close-button { position: absolute; top: 12px; right: 12px; color: rgba(255, 255, 255, 0.7); }
        .close-button:hover { color: white; }
        .modal-content { padding: 24px; max-height: 60vh; overflow-y: auto; }
        .content-text h3 { color: #21275c; font-size: 16px; font-weight: 600; margin-bottom: 16px; }
        .content-text p { line-height: 1.6; margin-bottom: 12px; font-size: 14px; color: #4a5568; }
        .policy-link { color: #04b2e1; text-decoration: none; }
        .policy-link:hover { text-decoration: underline; }
        .modal-footer { padding: 16px 24px; background-color: #f8f9fa; display: flex; justify-content: center; }
        .accept-button { background-color: #04b2e1 !important; color: white !important; font-weight: 600; padding: 12px 24px; border-radius: 8px; }
        .accept-button:hover { background-color: #21275c !important; }
    `]
})
export class TermsPrivacyModalComponent {
    constructor(
        public dialogRef: MatDialogRef<TermsPrivacyModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { title: string }
    ) {}

    closeDialog(): void {
        this.dialogRef.close();
    }
}

// --- PAYMENT MODAL COMPONENT ---
@Component({
    selector: 'app-payment-modal',
    standalone: true,
    imports: [ CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatProgressSpinnerModule, MatTabsModule ],
    template: `<div class="payment-modal-container"><div class="modal-header"><div class="header-icon-wrapper"><mat-icon>payment</mat-icon></div><div><h1 mat-dialog-title class="modal-title">Complete Your Payment</h1><p class="modal-subtitle">Pay KES {{ data.amount | number: '1.2-2' }} for {{ data.description }}</p></div><button mat-icon-button (click)="closeDialog()" class="close-button" aria-label="Close dialog"><mat-icon>close</mat-icon></button></div><mat-dialog-content class="modal-content"><mat-tab-group animationDuration="300ms" mat-stretch-tabs="true" class="payment-tabs"><mat-tab><ng-template mat-tab-label><div class="tab-label-content"><mat-icon>phone_iphone</mat-icon><span>M-PESA</span></div></ng-template><div class="tab-panel-content"><div class="sub-options"><button (click)="mpesaSubMethod = 'stk'" class="sub-option-btn" [class.active]="mpesaSubMethod === 'stk'"><mat-icon>tap_and_play</mat-icon><span>STK Push</span></button><button (click)="mpesaSubMethod = 'paybill'" class="sub-option-btn" [class.active]="mpesaSubMethod === 'paybill'"><mat-icon>article</mat-icon><span>Use Paybill</span></button></div><div *ngIf="mpesaSubMethod === 'stk'" class="option-view animate-fade-in"><p class="instruction-text">Enter your M-PESA phone number to receive a payment prompt.</p><form [formGroup]="stkForm"><mat-form-field appearance="outline"><mat-label>Phone Number</mat-label><input matInput formControlName="phoneNumber" placeholder="e.g., 0712345678" [disabled]="isProcessingStk"/><mat-icon matSuffix>phone_iphone</mat-icon></mat-form-field></form><button mat-raised-button class="action-button" (click)="processStkPush()" [disabled]="stkForm.invalid || isProcessingStk"><mat-spinner *ngIf="isProcessingStk" diameter="24"></mat-spinner><span *ngIf="!isProcessingStk">Pay KES {{ data.amount | number: '1.2-2' }}</span></button></div><div *ngIf="mpesaSubMethod === 'paybill'" class="option-view animate-fade-in"><p class="instruction-text">Use the details below on your M-PESA App to complete payment.</p><div class="paybill-details"><div class="detail-item"><span class="label">Paybill Number:</span><span class="value">853338</span></div><div class="detail-item"><span class="label">Account Number:</span><span class="value account-number">{{ data.reference }}</span></div></div><button mat-raised-button class="action-button" (click)="verifyPaybillPayment()" [disabled]="isVerifyingPaybill"><mat-spinner *ngIf="isVerifyingPaybill" diameter="24"></mat-spinner><span *ngIf="!isVerifyingPaybill">Verify Payment</span></button></div></div></mat-tab><mat-tab><ng-template mat-tab-label><div class="tab-label-content"><mat-icon>credit_card</mat-icon><span>Credit/Debit Card</span></div></ng-template><div class="tab-panel-content animate-fade-in"><div class="card-redirect-info"><p class="instruction-text">You will be redirected to pay via <strong>I&M Bank</strong>, our reliable and trusted payment partner.</p><button mat-raised-button class="action-button" (click)="redirectToCardGateway()" [disabled]="isRedirectingToCard"><mat-spinner *ngIf="isRedirectingToCard" diameter="24"></mat-spinner><span *ngIf="!isRedirectingToCard">Pay Using Credit/Debit Card</span></button></div></div></mat-tab></mat-tab-group></mat-dialog-content></div>`,
    styles: [`:host{display:block;--primary:#04b2e1;--secondary:#21275c;}.payment-modal-container{border-radius:16px;overflow:hidden;max-width:450px;box-shadow:0 10px 30px rgba(0,0,0,.1)}.modal-header{display:flex;align-items:center;padding:20px 24px;background-color:var(--secondary);color:white}.header-icon-wrapper{width:48px;height:48px;background-color:rgba(255,255,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-right:16px}.modal-title{font-size:20px;font-weight:600;margin:0}.modal-subtitle{font-size:14px;opacity:.9;margin-top:2px}.close-button{position:absolute;top:12px;right:12px;color:rgba(255,255,255,.7)}.modal-content{padding:0!important;background-color:#f9fafb}.tab-panel-content{padding:24px}.sub-options{display:flex;gap:8px;margin-bottom:24px;border-radius:12px;padding:6px;background-color:#e9ecef}.sub-option-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;border-radius:8px;border:none;background:0 0;font-weight:500;cursor:pointer;transition:all .3s ease;color:#495057}.sub-option-btn.active{background-color:#fff;color:var(--secondary);box-shadow:0 2px 4px rgba(0,0,0,.05)}.action-button{width:100%;height:50px;border-radius:12px;background-color:var(--secondary)!important;color:#fff!important;font-size:16px;font-weight:600}.paybill-details{background:#fff;border:1px dashed #d1d5db;border-radius:12px;padding:20px;margin-bottom:24px}.detail-item{display:flex;justify-content:space-between;align-items:center;font-size:16px;padding:12px 0}.detail-item .value{font-weight:700;color:var(--secondary)}.animate-fade-in{animation:fadeIn .4s ease-in-out}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`]
})
export class PaymentModalComponent implements OnInit {
    stkForm: FormGroup;
    mpesaSubMethod: 'stk' | 'paybill' = 'stk';
    isProcessingStk = false;
    isVerifyingPaybill = false;
    isRedirectingToCard = false;

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<PaymentModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: MpesaPayment
    ) {
        this.stkForm = this.fb.group({
            phoneNumber: [this.data.phoneNumber || '', [Validators.required, phoneNumberValidator]]
        });
    }

    ngOnInit(): void {}

    closeDialog(result: PaymentResult | null = null): void { this.dialogRef.close(result); }

    processStkPush(): void {
        if (this.stkForm.invalid) return;
        this.isProcessingStk = true;
        setTimeout(() => {
            this.isProcessingStk = false;
            this.closeDialog({ success: true, method: 'stk', reference: this.data.reference, mpesaReceipt: 'S' + Math.random().toString(36).substring(2, 12).toUpperCase() });
        }, 3000);
    }

    verifyPaybillPayment(): void {
        this.isVerifyingPaybill = true;
        setTimeout(() => {
            this.isVerifyingPaybill = false;
            this.closeDialog({ success: true, method: 'paybill', reference: this.data.reference });
        }, 3500);
    }

    redirectToCardGateway(): void {
        this.isRedirectingToCard = true;
        setTimeout(() => {
            this.isRedirectingToCard = false;
            this.closeDialog({ success: true, method: 'card', reference: this.data.reference });
        }, 2000);
    }
}

// --- MAIN MARINE CARGO QUOTATION COMPONENT ---
@Component({
    selector: 'app-marine-cargo-quotation',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        CurrencyPipe,
        DecimalPipe,
        MatDialogModule,
        MatIconModule,
        TitleCasePipe,
        ThousandsSeparatorValueAccessor,
        TermsPrivacyModalComponent,
        PaymentModalComponent
    ],
    providers: [DatePipe],
    templateUrl: './marine-cargo-quotation.component.html',
    styleUrls: ['./marine-cargo-quotation.component.scss'],
})
export class MarineCargoQuotationComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    quotationForm: FormGroup;
    exportRequestForm: FormGroup;
    highRiskRequestForm: FormGroup;
    currentStep: number = 1;
    showExportModal: boolean = false;
    showHighRiskModal: boolean = false;
    showTermsModal: boolean = false;
    showPrivacyModal: boolean = false;
    toastMessage: string = '';
    premiumCalculation: PremiumCalculation = this.resetPremiumCalculation();
    private editModeQuoteId: string | null = null;
    user: StoredUser | null = null;
    isLoggedIn: boolean = false;
    quoteResult: QuoteResult = null;
    displayUser: DisplayUser = { type: 'individual', name: 'Individual User' };
    isLoadingMarineData: boolean = true;
    isLoadingCargoTypes: boolean = true;
    marineProducts: MarineProduct[] = [];
    marinePackagingTypes: PackagingType[] = [];
    marineCategories: Category[] = [];
    marineCargoTypes: CargoTypeData[] = [];
    selectedFiles: { [key: string]: File | null } = {
        kraPinUpload: null,
        nationalIdUpload: null,
        invoiceUpload: null,
        idfUpload: null,
    };
    private readonly TAX_RATES = { PHCF_RATE: 0.0025, TRAINING_LEVY: 0.0025, COMMISSION_RATE: 0.1 };
    readonly blacklistedCountries: string[] = ['Russia', 'Ukraine', 'North Korea', 'Syria', 'Iran', 'Yemen', 'Sudan', 'Somalia'];
    readonly allCountriesList: string[] = ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Canada', 'China', 'Denmark', 'Egypt', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Mexico', 'Netherlands', 'New Zealand', 'Nigeria', 'North Korea', 'Norway', 'Pakistan', 'Russia', 'Saudi Arabia', 'Somalia', 'South Africa', 'Spain', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Tanzania', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States of America', 'Yemen', 'Zambia', 'Zimbabwe'];
    filteredCountriesList: string[] = [];
    readonly portOptions: string[] = ['Lamu', 'Mombasa', 'Kisumu'];
    readonly kenyanCounties: string[] = [
        'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
        'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
        'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi', 'Nakuru',
        'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
        'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
    ].sort();
    isSaving = false;
    private readonly quoteStorageKey = 'savedMarineQuote';

    constructor(
        private fb: FormBuilder,
        private router: Router,
        public dialog: MatDialog,
        private authService: AuthenticationService,
        private userService: UserService,
        private route: ActivatedRoute,
        private datePipe: DatePipe,
        private quotationService: QuoteService
    ) {
        this.quotationForm = this.createQuotationForm();
        this.exportRequestForm = this.createExportRequestForm();
        this.highRiskRequestForm = this.createHighRiskRequestForm();
        this.filteredCountriesList = this.allCountriesList.filter(c => c !== 'Kenya');
    }

    ngOnInit(): void {
        this.authService.currentUser$
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                this.isLoggedIn = !!user;
                if (this.isLoggedIn) {
                    this.user = user;
                    this.enableLoggedInControls();
                } else {
                    this.user = null;
                    this.disableLoggedInControls();
                }
            });

        this.isLoadingMarineData = true;

        forkJoin({
            products: this.userService.getMarineProducts(),
            packagingTypes: this.userService.getMarinePackagingTypes(),
            categories: this.userService.getMarineCategories()
        }).subscribe({
            next: (data) => {
                this.marineProducts = data.products || [];
                this.marinePackagingTypes = data.packagingTypes || [];
                this.marineCategories = data.categories || [];
                this.isLoadingMarineData = false;
            },
            error: (err) => {
                console.error('Error loading marine data:', err);
                this.isLoadingMarineData = false;
            }
        });

        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
            const quoteId = params['editId'];
            if (quoteId) {
                this.editModeQuoteId = quoteId;
                this.loadQuoteForEditing(quoteId);
            } else {
                this.loadQuoteFromLocalStorage();
            }
        });

        this.setupFormSubscriptions();
        this.setDefaultDate();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // --- FORM SETUP AND MANAGEMENT ---

    private createQuotationForm(): FormGroup {
        return this.fb.group({
            // Personal and Contact Details
            firstName: ['', [Validators.required, nameValidator]],
            lastName: ['', [Validators.required, nameValidator]],
            email: ['', [Validators.required, Validators.email]],
            phoneNumber: ['', [Validators.required, phoneNumberValidator]],
            idNumber: ['', [Validators.required, idNumberValidator]],
            kraPin: ['', [Validators.required, kraPinValidator]],
            
            // KYC Document Uploads
            kycDocuments: this.fb.group({
                kraPinUpload: [null, Validators.required],
                nationalIdUpload: [null, Validators.required],
                invoiceUpload: [null, Validators.required],
                idfUpload: [null, Validators.required],
            }, { validators: duplicateFileValidator }),

            // Shipment Details
            tradeType: ['import', Validators.required],
            modeOfShipment: ['', Validators.required],
            marineProduct: ['ICC (A) All Risks'], // Set default value
            marineCategory: ['ICC (A) All Risks', Validators.required],
            marineCargoType: ['', Validators.required],
            marinePackagingType: ['', Validators.required],
            origin: ['', Validators.required],
            destination: ['Kenya'],
            vesselName: [''],
            dateOfDispatch: ['', [Validators.required, this.noPastDatesValidator]],
            sumInsured: [null, [Validators.required, Validators.min(1)]],
            descriptionOfGoods: ['', [Validators.required, minWords(3)]],
            ucrNumber: ['', ucrNumberValidator],
            idfNumber: ['', [Validators.required, idfNumberValidator]],
            
            // --- Logged-In User Controls ---
            estimatedArrivalDate: this.fb.control({ value: '', disabled: true }, [Validators.required, this.noPastDatesValidator]),
            loadingPort: this.fb.control({ value: '', disabled: true }, Validators.required),
            portOfDischarge: this.fb.control({ value: '', disabled: true }, Validators.required),
            finalDestinationCounty: this.fb.control({ value: '', disabled: true }, Validators.required),
            shippingItems: this.fb.array([this.createShippingItem()], { validators: Validators.required }),

            // Consent
            termsAndPolicyConsent: [false, Validators.requiredTrue],
        });
    }

    private enableLoggedInControls(): void {
        this.quotationForm.get('estimatedArrivalDate')?.enable();
        this.quotationForm.get('loadingPort')?.enable();
        this.quotationForm.get('portOfDischarge')?.enable();
        this.quotationForm.get('finalDestinationCounty')?.enable();
        this.quotationForm.get('shippingItems')?.enable();
    }

    private disableLoggedInControls(): void {
        this.quotationForm.get('estimatedArrivalDate')?.disable();
        this.quotationForm.get('loadingPort')?.disable();
        this.quotationForm.get('portOfDischarge')?.disable();
        this.quotationForm.get('finalDestinationCounty')?.disable();
        this.quotationForm.get('shippingItems')?.disable();
    }
    
    // --- FORM SUBMISSION ---

    onSubmit(): void {
        this.isSaving = true;
        this.quotationForm.markAllAsTouched();
        this.kycDocuments.markAllAsTouched();

        if (!this.quotationForm.valid) {
            this.showToast('Please fill in all required fields correctly and ensure no documents are uploaded twice.');
            this.scrollToFirstError();
            this.isSaving = false;
            return;
        }

        const marineProductValue = this.quotationForm.get('marineProduct')?.value;
        const packagingType = this.quotationForm.get('marinePackagingType')?.value;
        const category = this.quotationForm.get('marineCategory')?.value;
        const cargoType = this.quotationForm.get('marineCargoType')?.value;
        const selectedProduct = this.marineProducts.find(p => p.productdisplay === marineProductValue);
        const selectedCategory = this.marineCategories.find(p => p.catname === category);
        const selectedCargoType = this.marineCargoTypes.find(p => p.ctname === cargoType);
        const formattedDate = this.datePipe.transform(this.quotationForm.get('dateOfDispatch')?.value, 'dd MMM yyyy');

        const metadata = {
            suminsured: this.quotationForm.get('sumInsured')?.value,
            firstName: this.quotationForm.get('firstName')?.value,
            lastName: this.quotationForm.get('lastName')?.value,
            email: this.quotationForm.get('email')?.value,
            phoneNumber: this.quotationForm.get('phoneNumber')?.value,
            idNumber: this.quotationForm.get('idNumber')?.value,
            kraPin: this.quotationForm.get('kraPin')?.value,
            shippingid: this.quotationForm.get('modeOfShipment')?.value,
            tradeType: this.quotationForm.get('tradeType')?.value,
            countryOrigin: this.quotationForm.get('origin')?.value,
            destination: this.quotationForm.get('destination')?.value,
            vesselName: this.quotationForm.get('vesselName')?.value,
            ucrNumber: this.quotationForm.get('ucrNumber')?.value,
            idfNumber: this.quotationForm.get('idfNumber')?.value,
            goodsDescription: this.quotationForm.get('descriptionOfGoods')?.value,
            coverDateFrom: formattedDate,
            dateFormat: 'dd MMM yyyy',
            locale: "en_US",
            productId: selectedProduct?.id,
            packagetypeid: packagingType,
            categoryid: selectedCategory?.id,
            cargoId: selectedCargoType?.id,
        };

        const formData = new FormData();
        const kycDocs = this.kycDocuments.value;
        formData.append('kraPinUpload', kycDocs.kraPinUpload);
        formData.append('nationalIdUpload', kycDocs.nationalIdUpload);
        formData.append('invoiceUpload', kycDocs.invoiceUpload);
        formData.append('idfUpload', kycDocs.idfUpload);
        formData.append('metadata', JSON.stringify(metadata));

        this.quotationService.createQuote(formData).subscribe({
            next: (res) => {
                this.quoteResult = res;
                this.currentStep = 2;
                this.isSaving = false;
                localStorage.removeItem(this.quoteStorageKey);
            },
            error: (err) => {
                console.error('Quote creation error:', err);
                this.showToast('An error occurred while creating the quote. Please try again.');
                this.isSaving = false;
            }
        });
    }

    // --- FORM ARRAY HELPERS (Shipping Items) ---

    get shippingItems(): FormArray {
        return this.quotationForm.get('shippingItems') as FormArray;
    }

    get kycDocuments(): FormGroup {
        return this.quotationForm.get('kycDocuments') as FormGroup;
    }

    createShippingItem(): FormGroup {
        return this.fb.group({
            itemName: ['', Validators.required],
            quantity: [1, [Validators.required, Validators.min(1)]],
            unitCost: [null, [Validators.required, Validators.min(0)]]
        });
    }

    addShippingItem(): void {
        this.shippingItems.push(this.createShippingItem());
    }

    removeShippingItem(index: number): void {
        if (this.shippingItems.length > 1) {
            this.shippingItems.removeAt(index);
        }
    }

    // --- DYNAMIC FORM LOGIC & SUBSCRIPTIONS ---
    
    private setupFormSubscriptions(): void {
        this.quotationForm.get('tradeType')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((type) => {
            if (type === 'export') { 
                this.showExportModal = true; 
            }
        });
        
        this.quotationForm.get('origin')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((country) => {
            if (country && this.blacklistedCountries.includes(country)) {
                this.highRiskRequestForm.patchValue({ originCountry: country });
                this.showHighRiskModal = true;
            }
        });

        this.quotationForm.valueChanges.pipe(
            debounceTime(1000),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.saveQuoteToLocalStorage(value);
        });
    }

    onCategorySelected(event: Event) {
        this.marineCargoTypes = [];
        this.quotationForm.get('marineCargoType')?.reset();
        const input = (event.target as HTMLInputElement).value;
        const selected = this.marineCategories.find(p => p.catname === input);
        if (selected) {
            this.isLoadingCargoTypes = true;
            this.userService.getCargoTypesByCategory(selected.id).subscribe({
                next: (types) => {
                    this.marineCargoTypes = types || [];
                    this.isLoadingCargoTypes = false;
                },
                error: (err) => {
                    console.error('Error fetching cargo types', err);
                    this.isLoadingCargoTypes = false;
                }
            });
        }
    }

    onFileSelected(event: Event, controlName: string) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            this.selectedFiles[controlName] = file;
            this.kycDocuments.get(controlName)?.setValue(file);
            this.kycDocuments.updateValueAndValidity();
        }
    }

    // --- LOCAL STORAGE & STATE MANAGEMENT ---

    private saveQuoteToLocalStorage(formValue: any): void {
        const valueToSave = { ...formValue };
        delete valueToSave.kycDocuments;
        localStorage.setItem(this.quoteStorageKey, JSON.stringify(valueToSave));
    }

    private loadQuoteFromLocalStorage(): void {
        const savedQuoteJSON = localStorage.getItem(this.quoteStorageKey);
        if (savedQuoteJSON) {
            const savedQuote = JSON.parse(savedQuoteJSON);
            this.quotationForm.patchValue(savedQuote);
            this.showToast('Your previous progress has been restored.');
        }
    }

    // --- MODAL & UI HELPERS ---

    openTermsModal(event?: Event): void {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        this.showTermsModal = true;
    }

    closeTermsModal(): void { this.showTermsModal = false; }

    openPrivacyModal(event?: Event): void {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        this.showPrivacyModal = true;
    }

    closePrivacyModal(): void { this.showPrivacyModal = false; }
    
    private scrollToFirstError(): void {
        setTimeout(() => {
            const firstErrorElement = document.querySelector('.ng-invalid.ng-touched');
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
    
    private showToast(message: string): void {
        this.toastMessage = message;
        setTimeout(() => (this.toastMessage = ''), 5000);
    }

    // --- VALIDATION HELPERS ---

    isFieldInvalid(form: FormGroup, field: string): boolean {
        const control = form.get(field);
        return !!control && control.invalid && (control.dirty || control.touched);
    }

    getErrorMessage(form: FormGroup, field: string): string {
        const control = form.get(field);
        
        if (field === 'kycDocuments' && control?.hasError('duplicateFiles')) {
            return 'You uploaded the same document twice.';
        }
        
        if (!control || !control.errors) return '';

        if (control.hasError('required')) return 'This field is required.';
        if (control.hasError('email')) return 'Please enter a valid email address.';
        if (control.hasError('requiredTrue')) return 'You must agree to proceed.';
        if (control.hasError('pastDate')) return 'Date cannot be in the past.';
        if (control.hasError('min')) return 'Value must be greater than 0.';
        if (control.hasError('invalidKraPin')) return 'Invalid KRA PIN. Format: A123456789Z.';
        if (control.hasError('invalidPhoneNumber')) return 'Invalid phone number. Format: 0712345678.';
        if (control.hasError('invalidIdNumber')) return 'Invalid ID. Must be 5-15 alphanumeric characters.';
        if (control.hasError('invalidName')) return 'Name can only contain letters, spaces, and hyphens.';
        if (control.hasError('invalidIdfNumber')) return 'Invalid IDF. Format: 12ABCDE1234567890.';
        if (control.hasError('invalidUcrNumber')) return 'Invalid UCR. Format: 12ABC123456789D1234567890.';
        if (control.hasError('minWords')) return `A minimum of ${control.errors['minWords'].requiredWords} words is required.`;
        if (control.hasError('maxWords')) return `Maximum ${control.errors['maxWords'].maxWords} words allowed.`;

        return 'This field has an error.';
    }
    
    noPastDatesValidator(control: AbstractControl): { [key: string]: boolean } | null {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const controlDate = new Date(control.value);
        return controlDate < today ? { pastDate: true } : null;
    }

    // --- OTHER COMPONENT LOGIC ---

    private loadQuoteForEditing(quoteId: string): void {
        this.showToast(`Editing functionality for quote ${quoteId} is not yet implemented.`);
        this.loadQuoteFromLocalStorage();
    }

    handlePayment(): void {
        if (this.isLoggedIn) {
            this.openPaymentModal();
        } else {
            this.showToast('Please log in or register to complete your purchase.');
            setTimeout(() => { this.router.navigate(['/']); }, 2500);
        }
    }
    
    private openPaymentModal(): void {
        const paymentData: MpesaPayment = {
            amount: this.premiumCalculation.totalPayable,
            phoneNumber: this.quotationForm.get('phoneNumber')?.value || '',
            reference: `MQ${Date.now()}`,
            description: 'Marine Cargo Insurance Premium'
        };

        const dialogRef = this.dialog.open(PaymentModalComponent, {
            width: '500px',
            data: paymentData,
            disableClose: true
        });

        dialogRef.afterClosed().subscribe((result: PaymentResult) => {
            if (result && result.success) {
                this.showToast(`Payment successful! Reference: ${result.reference}`);
            }
        });
    }

    closeForm(): void {
        this.router.navigate(this.isLoggedIn ? ['/sign-up/dashboard'] : ['/']);
    }

    logout(): void {
        this.authService.logout();
        this.showToast('You have been logged out successfully.');
        setTimeout(() => { this.router.navigate(['/']); }, 1500);
    }
    
    private createModalForm(): FormGroup {
        return this.fb.group({
            kraPin: ['', [Validators.required, kraPinValidator]],
            firstName: ['', [Validators.required, nameValidator]],
            lastName: ['', [Validators.required, nameValidator]],
            email: ['', [Validators.required, Validators.email]],
            phoneNumber: ['', [Validators.required, phoneNumberValidator]],
            marineCargoType: ['', Validators.required],
            idfNumber: ['', idfNumberValidator],
            ucrNumber: ['', ucrNumberValidator],
            originCountry: ['', Validators.required],
            destinationCountry: ['', Validators.required],
            shipmentDate: ['', [Validators.required, this.noPastDatesValidator]],
            goodsDescription: ['', [Validators.required, minWords(10), maxWords(100)]],
            termsAndPolicyConsent: [false, Validators.requiredTrue],
        });
    }

    private createExportRequestForm(): FormGroup {
        const form = this.createModalForm();
        form.get('originCountry')?.patchValue('Kenya');
        form.get('originCountry')?.disable();
        form.addControl('vesselName', this.fb.control('', Validators.required));
        form.get('ucrNumber')?.setValidators([Validators.required, ucrNumberValidator]);
        return form;
    }

    private createHighRiskRequestForm(): FormGroup { 
        return this.createModalForm(); 
    }

    private setDefaultDate(): void {
        if (!this.quotationForm.get('dateOfDispatch')?.value) {
            this.quotationForm.patchValue({ dateOfDispatch: this.getToday() });
        }
    }

    private resetPremiumCalculation(): PremiumCalculation {
        return { basePremium: 0, phcf: 0, trainingLevy: 0, stampDuty: 0, commission: 0, totalPayable: 0, currency: 'KES' };
    }

    onExportRequestSubmit(): void {
        if (this.exportRequestForm.valid) {
            this.closeAllModals();
            this.showToast('Export request submitted. Our underwriter will contact you.');
        } else { 
            this.showToast('Please fill in all required fields correctly.'); 
        }
    }

    onHighRiskRequestSubmit(): void {
        if (this.highRiskRequestForm.valid) {
            this.closeAllModals();
            this.showToast('High-risk request submitted for manual review.');
        } else { 
            this.showToast('Please fill in all required fields correctly.'); 
        }
    }

    closeAllModals(): void {
        this.showExportModal = false; 
        this.showHighRiskModal = false;
        this.quotationForm.get('tradeType')?.setValue('import', { emitEvent: false });
        this.quotationForm.get('origin')?.setValue('', { emitEvent: false });
        this.exportRequestForm.reset({ originCountry: 'Kenya' });
        this.highRiskRequestForm.reset();
    }

    downloadQuote(): void { 
        if (this.quotationForm.valid) { 
            this.showToast('Quote download initiated successfully.'); 
        } 
    }

    getToday(): string { 
        return new Date().toISOString().split('T')[0]; 
    }

    goToStep(step: number): void { 
        this.currentStep = step; 
    }
}