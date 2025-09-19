import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import {
    forkJoin,
    Subject,
    takeUntil,
    debounceTime,
    Observable,
    of,
    map,
    timeout,
    interval,
    switchMap,
    takeWhile, catchError, throwError,
} from 'rxjs';
import { AuthenticationService, PortData, StoredUser } from '../shared/services/auth.service';
import {
    CargoTypeData,
    Category,
    Country, County,
    MarineProduct,
    PackagingType,
    QuoteResult as CoreQuoteResult,
} from '../../../core/user/user.types';
import { UserService } from '../../../core/user/user.service';
import { ThousandsSeparatorValueAccessor } from '../directives/thousands-separator-value-accessor';
import { QuoteService } from '../shared/services/quote.service';
import { FuseAlertComponent } from '../../../../@fuse/components/alert';
import { data } from 'autoprefixer';

// --- INTERFACES & VALIDATORS ---

export function minWords(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) return null;
        const words = control.value.trim().split(/\s+/).filter(word => word.length > 0).length;
        return words < min ? { minWords: { requiredWords: min, actualWords: words } } : null;
    };
}

export function maxWords(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) return null;
        const words = control.value.trim().split(/\s+/).filter(word => word.length > 0).length;
        return words > max ? { maxWords: { maxWords: max, actualWords: words } } : null;
    };
}

export const kraPinValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const kraPinPattern = /^[A-Z]\d{9}[A-Z]$/i;
    return kraPinPattern.test(control.value) ? null : { invalidKraPin: true };
};

export const kenyanPhoneNumberValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const phonePattern = /^(?:\+254\d{9}|0\d{9})$/;
    return phonePattern.test(control.value) ? null : { invalidPhoneNumber: true };
};

export const idNumberValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const idPattern = /^[0-9]{7,8}$/;
    return idPattern.test(control.value) ? null : { invalidIdNumber: true };
};

export const idfNumberValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const idfPattern = /^\d{2}[A-Z]{5}\d{10}$/i;
    return idfPattern.test(control.value) ? null : { invalidIdfNumber: true };
};

export const ucrNumberValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const ucrPattern = /^\d{2}[A-Z]{3}\d{9}[A-Z]\d{10}$/i;
    return ucrPattern.test(control.value) ? null : { invalidUcrNumber: true };
};

export const nameValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const namePattern = /^[a-zA-Z\s'-]+$/;
    return namePattern.test(control.value) ? null : { invalidName: true };
};

export const enhancedDuplicateFileValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup)) {
        return null;
    }
    const files: { name: string, control: string, file: File }[] = [];
    Object.keys(control.controls).forEach(controlName => {
        const file = control.get(controlName)?.value;
        if (file instanceof File) {
            files.push({ name: file.name.toLowerCase(), control: controlName, file });
        }
    });
    if (files.length <= 1) {
        return null;
    }
    const duplicates: string[] = [];
    const seen = new Set<string>();
    files.forEach(({ name, control }) => {
        if (seen.has(name)) {
            duplicates.push(control);
        } else {
            seen.add(name);
        }
    });
    return duplicates.length > 0 ? {
        duplicateFiles: {
            duplicatedControls: duplicates,
            message: 'The same document cannot be uploaded to multiple fields',
        },
    } : null;
};

export function enhancedFileTypeValidator(allowedTypes: string[], maxSizeMB: number = 10): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const file = control.value as File;
        if (!file) {
            return null;
        }
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension || !allowedTypes.map(t => t.toLowerCase()).includes(extension)) {
            return {
                invalidFileType: {
                    allowed: allowedTypes.join(', '),
                    actual: extension || 'unknown',
                },
            };
        }
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            return {
                fileTooLarge: {
                    maxSize: maxSizeMB,
                    actualSize: Math.round(file.size / (1024 * 1024) * 100) / 100,
                },
            };
        }
        return null;
    };
}

interface QuoteResult extends CoreQuoteResult {
    id: string;
    currency: string;
}

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

type EnhancedStoredUser = StoredUser & { uid: string; }; // LOCAL TYPE EXTENSION

export interface KycShippingPaymentModalData {
    quoteId: string;
    sumInsured: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    origin: string;
    destination: string;
    modeOfShipment: string;
    marineProduct: string;
    marineCategory: string;
    marineCargoType: string;
    marinePackagingType: string;
    tradeType: string;
    totalPremium: number;
    currency: string;
}

declare module '../shared/services/quote.service' {
    interface QuoteService {
        updateQuoteWithKycAndShipping(quoteId: string, formData: FormData): Observable<any>;
    }
}
const originalQuoteServiceProto = QuoteService.prototype as any;
if (!originalQuoteServiceProto.updateQuoteWithKycAndShipping) {
    originalQuoteServiceProto.updateQuoteWithKycAndShipping = function(quoteId: string, formData: FormData): Observable<any> {
        console.warn('MOCK: QuoteService.updateQuoteWithKycAndShipping called.');
        console.log('Quote ID:', quoteId);
        const data: { [key: string]: any } = {};
        formData.forEach((value, key) => {
            if (value instanceof File) {
                data[key] = `File: ${value.name} (${value.size} bytes)`;
            } else {
                data[key] = value;
            }
        });
        console.log('Received FormData (MOCK):', data);
        return of({ success: true, message: 'Quote details updated successfully (mock).' }).pipe(
            debounceTime(1500),
        );
    };
}


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
                    <p>Geminia Insurance Company Limited is committed to protecting the fundamental human right to
                        privacy of those with whom we interact. We recognize the need to safeguard personal data that is
                        collected or disclosed to us as part of the Know-your-customer information required by us in
                        order to provide you with the requisite financial product or service.</p>
                    <p>We are committed to complying with the requirements of the Data Protection Act and the attendant
                        regulations as well as best global best practices regarding the processing of your personal
                        data. In this regard, you are required to acquaint yourselves with our data privacy statement
                        (<a href="https://geminia.co.ke/data-privacy-statement/" target="_blank" class="policy-link">https://geminia.co.ke/data-privacy-statement/</a>)
                        which is intended to tell you how we use your personal data and describes how we collect and
                        process your personal data during and after your relationship with us.</p>
                </div>
            </mat-dialog-content>
            <div class="modal-footer">
                <button (click)="closeDialog()" class="btn-primary">I Understand</button>
            </div>
        </div>
    `,
    styles: [`
        .modal-container {
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            max-width: 600px;
            max-height: 80vh;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            background-color: #21275c;
            color: white;
            position: relative;
        }

        .modal-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }

        .close-button {
            position: absolute;
            top: 12px;
            right: 12px;
            color: rgba(255, 255, 255, 0.7);
        }

        .close-button:hover {
            color: white;
        }

        .modal-content {
            padding: 24px;
            max-height: 60vh;
            overflow-y: auto;
        }

        .content-text h3 {
            color: #21275c;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
        }

        .content-text p {
            line-height: 1.6;
            margin-bottom: 12px;
            font-size: 14px;
            color: #4a5568;
        }

        .policy-link {
            color: #04b2e1;
            text-decoration: none;
        }

        .policy-link:hover {
            text-decoration: underline;
        }

        .modal-footer {
            padding: 16px 24px;
            background-color: #f8f9fa;
            display: flex;
            justify-content: flex-end;
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.75rem 1.5rem;
            font-weight: 500;
            color: white;
            background-color: #04b2e1;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
            background-color: #21275c;
        }

        .btn-primary:disabled {
            background-color: #9ca3af;
            cursor: not-allowed;
            opacity: 0.7;
        }
    `],
})
export class TermsPrivacyModalComponent {
    constructor(public dialogRef: MatDialogRef<TermsPrivacyModalComponent>, @Inject(MAT_DIALOG_DATA) public data: {
        title: string
    }) {
    }

    closeDialog(): void {
        this.dialogRef.close();
    }
}

@Component({
    selector: 'app-payment-modal',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatProgressSpinnerModule, MatTabsModule],
    template: `
        <div class="payment-modal-container">
            <div class="modal-header">
                <div class="header-icon-wrapper">
                    <mat-icon>payment</mat-icon>
                </div>
                <div><h1 mat-dialog-title class="modal-title">Complete Your Payment</h1>
                    <p class="modal-subtitle">Pay KES {{ data.amount | number: '1.2-2' }} for {{ data.description }}</p>
                </div>
                <button mat-icon-button (click)="closeDialog()" class="close-button" aria-label="Close dialog">
                    <mat-icon>close</mat-icon>
                </button>
            </div>
            <mat-dialog-content class="modal-content">
                <mat-tab-group animationDuration="300ms" mat-stretch-tabs="true" class="payment-tabs">
                    <mat-tab>
                        <ng-template mat-tab-label>
                            <div class="tab-label-content">
                                <mat-icon>phone_iphone</mat-icon>
                                <span>M-PESA</span></div>
                        </ng-template>
                        <div class="tab-panel-content">
                            <div class="sub-options">
                                <button (click)="mpesaSubMethod = 'stk'" class="sub-option-btn"
                                        [class.active]="mpesaSubMethod === 'stk'">
                                    <mat-icon>tap_and_play</mat-icon>
                                    <span>STK Push</span></button>
                                <button (click)="mpesaSubMethod = 'paybill'" class="sub-option-btn"
                                        [class.active]="mpesaSubMethod === 'paybill'">
                                    <mat-icon>article</mat-icon>
                                    <span>Use Paybill</span></button>
                            </div>
                            <div *ngIf="mpesaSubMethod === 'stk'" class="option-view animate-fade-in"><p
                                class="instruction-text">Enter your M-PESA phone number to receive a payment prompt.</p>
                                <form [formGroup]="stkForm">
                                    <mat-form-field appearance="outline">
                                        <mat-label>Phone Number</mat-label>
                                        <input matInput formControlName="phoneNumber" placeholder="e.g., 0712345678"
                                               [disabled]="isProcessingStk" />
                                        <mat-icon matSuffix>phone_iphone</mat-icon>
                                    </mat-form-field>
                                </form>
                                <button class="btn-primary w-full" (click)="processStkPush()"
                                        [disabled]="stkForm.invalid || isProcessingStk">
                                    <mat-spinner *ngIf="isProcessingStk" diameter="24"></mat-spinner>
                                    <span *ngIf="!isProcessingStk">Pay KES {{ data.amount | number: '1.2-2' }}</span>
                                    <span *ngIf="isProcessingStk">Processing...</span>
                                </button>
                                <div class="mt-3" *ngIf="!isProcessingStk && paymentSuccess !== undefined">
                                    <p
                                        *ngIf="paymentSuccess"
                                        class="text-green-600 font-semibold"
                                    >
                                        ✅ Payment successful!
                                    </p>
                                    <p
                                        *ngIf="paymentSuccess === false"
                                        class="text-red-600 font-semibold"
                                    >
                                        ❌ Payment failed. Please try again.
                                    </p>
                                </div>
                            </div>
                            <div *ngIf="mpesaSubMethod === 'paybill'" class="option-view animate-fade-in"><p
                                class="instruction-text">Use the details below on your M-PESA App to complete
                                payment.</p>
                                <div class="paybill-details">
                                    <div class="detail-item"><span class="label">Paybill Number:</span><span
                                        class="value">853338</span></div>
                                    <div class="detail-item"><span class="label">Account Number:</span><span
                                        class="value account-number">{{ data.reference }}</span></div>
                                </div>
                                <button class="btn-primary w-full" (click)="verifyPaybillPayment()"
                                        [disabled]="isVerifyingPaybill">
                                    <mat-spinner *ngIf="isVerifyingPaybill" diameter="24"></mat-spinner>
                                    <span *ngIf="!isVerifyingPaybill">Verify Payment</span></button>
                            </div>
                        </div>
                    </mat-tab>
                    <mat-tab>
                        <ng-template mat-tab-label>
                            <div class="tab-label-content">
                                <mat-icon>credit_card</mat-icon>
                                <span>Credit/Debit Card</span></div>
                        </ng-template>
                        <div class="tab-panel-content animate-fade-in">
                            <div class="card-redirect-info"><p class="instruction-text">You will be redirected to pay
                                via <strong>I&M Bank</strong>, our reliable and trusted payment partner.</p>
                                <button class="btn-primary w-full" (click)="redirectToCardGateway()"
                                        [disabled]="isRedirectingToCard">
                                    <mat-spinner *ngIf="isRedirectingToCard" diameter="24"></mat-spinner>
                                    <span *ngIf="!isRedirectingToCard">Pay Using Credit/Debit Card</span></button>
                            </div>
                        </div>
                    </mat-tab>
                </mat-tab-group>
            </mat-dialog-content>
        </div>`,
    styles: [`
        .payment-modal-container {
            border-radius: 16px;
            overflow: hidden;
            max-width: 450px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, .1);
            width: 100%;
        }

        .modal-header {
            display: flex;
            align-items: center;
            padding: 20px 24px;
            background-color: #21275c;
            color: white
        }

        .header-icon-wrapper {
            width: 48px;
            height: 48px;
            background-color: rgba(255, 255, 255, .1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px
        }

        .modal-title {
            color: white;
            font-size: 20px;
            font-weight: 600;
            margin: 0
        }

        .modal-subtitle {
            font-size: 14px;
            opacity: .9;
            margin-top: 2px
        }

        .close-button {
            position: absolute;
            top: 12px;
            right: 12px;
            color: rgba(255, 255, 255, .7)
        }

        .modal-content {
            padding: 0 !important;
            background-color: #f9fafb
        }

        .tab-panel-content {
            padding: 24px
        }

        .sub-options {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            border-radius: 12px;
            padding: 6px;
            background-color: #e9ecef
        }

        .sub-option-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px;
            border-radius: 8px;
            border: none;
            background: 0 0;
            font-weight: 500;
            cursor: pointer;
            transition: all .3s ease;
            color: #495057
        }

        .sub-option-btn.active {
            background-color: #fff;
            color: #21275c;
            box-shadow: 0 2px 4px rgba(0, 0, 0, .05)
        }

        .paybill-details {
            background: #fff;
            border: 1px dashed #d1d5db;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px
        }

        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            padding: 12px 0
        }

        .detail-item .value {
            font-weight: 700;
            color: #21275c
        }

        .animate-fade-in {
            animation: fadeIn .4s ease-in-out
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px)
            }
            to {
                opacity: 1;
                transform: translateY(0)
            }
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.75rem 1.5rem;
            font-weight: 500;
            color: white;
            background-color: #04b2e1;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            transition: background-color 0.2s;
            height: 50px;
        }

        .btn-primary:hover:not(:disabled) {
            background-color: #21275c;
        }

        .btn-primary:disabled {
            background-color: #9ca3af;
            cursor: not-allowed;
            opacity: 0.7;
        }

        @media (max-width: 480px) {
            .modal-header {
                padding: 16px;
            }
            .modal-title {
                font-size: 18px;
            }
            .modal-subtitle {
                font-size: 13px;
            }
            .tab-panel-content {
                padding: 16px;
            }
            .sub-options {
                flex-direction: column;
            }
        }
    `],
})
export class PaymentModalComponent implements OnInit {
    stkForm: FormGroup;
    mpesaSubMethod: 'stk' | 'paybill' = 'stk';
    isProcessingStk = false;
    paymentSuccess?: boolean;
    isVerifyingPaybill = false;
    isRedirectingToCard = false;

    constructor(private fb: FormBuilder, public dialogRef: MatDialogRef<PaymentModalComponent>, @Inject(MAT_DIALOG_DATA) public data: MpesaPayment,
                public quoteService: QuoteService,private router: Router) {
        this.stkForm = this.fb.group({ phoneNumber: [this.data.phoneNumber || '', [Validators.required, kenyanPhoneNumberValidator]] });
    }

    ngOnInit(): void {
    }

    closeDialog(result: PaymentResult | null = null): void {
        this.dialogRef.close(result);
    }

    processStkPush(): void {
        if (this.stkForm.invalid) return;

        this.isProcessingStk = true;
        this.paymentSuccess = undefined;

        const phoneValue = this.stkForm.get('phoneNumber')?.value;

        this.quoteService.stkPush(phoneValue, 1, this.data.reference)
            .subscribe({
                next: (res) => {
                    console.log('STK Push response', res);

                    const checkOutRequestId = res.checkOutRequestId;
                    const merchantRequestId = res.merchantRequestId;

                    interval(5000).pipe(
                        switchMap(() =>
                            this.quoteService.validatePayment(merchantRequestId, checkOutRequestId)
                        ),
                        // stop polling once success or failure is reached
                        takeWhile(
                            (statusRes) =>
                                statusRes.resultCode === 0 && !statusRes.mpesaCode, // keep polling while still pending
                            true // emit the last value that breaks the condition
                        ),
                        catchError((err) => {
                            this.isProcessingStk = false;
                            return throwError(() => err);
                        })
                    ).subscribe({
                        next: (statusRes) => {

                            if (statusRes.resultCode === 0 && statusRes.mpesaCode) {
                                // success
                                this.isProcessingStk = false;
                                this.paymentSuccess = true;
                                setTimeout(() => {
                                    this.dialogRef.close(true);
                                    this.router.navigate(['/dashboard']);
                                }, 1000);


                            } else if (statusRes.resultCode !== 0) {
                                // user cancelled or failed
                                this.isProcessingStk = false;
                                this.paymentSuccess = false;

                            }
                            // If still pending (resultCode===0 but no mpesaCode), the loop continues until it changes
                        },
                        error: (err) => {
                            console.error('Polling error or timeout', err);
                            this.isProcessingStk = false;
                        }
                    });
                },
                error: (err) => {
                    if (err.name === 'TimeoutError') {
                        console.error('STK request timed out');
                    } else {
                        console.error('Error', err);
                    }
                    this.isProcessingStk = false;
                }
            });
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


@Component({
    selector: 'app-kyc-shipping-payment-modal',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule,
        MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, DatePipe,
        ThousandsSeparatorValueAccessor, PaymentModalComponent, FuseAlertComponent,
    ],
    providers: [DatePipe],
    template: `
        <div class="modal-container">
            <div class="modal-header">
                <h2 mat-dialog-title class="modal-title">Complete Purchase Details</h2>
                <button mat-icon-button (click)="closeDialog('quote_saved_and_closed')" class="close-button"
                        aria-label="Close dialog">
                    <mat-icon>close</mat-icon>
                </button>
            </div>
            <mat-dialog-content class="modal-content">
                <form [formGroup]="kycShippingForm" class="p-4">

                    <h3 class="mb-4 text-xl font-semibold text-gray-800">Your Details (KYC)</h3>
                    <div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">KRA PIN <span
                                class="text-red-500">*</span></label>
                            <input type="text" formControlName="kraPin"
                                   class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                   placeholder="Format: A123456789Z"
                                   [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'kraPin')}" />
                            <div *ngIf="isFieldInvalid(kycShippingForm, 'kraPin')"
                                 class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'kraPin') }}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">ID Number <span class="text-red-500">*</span></label>
                            <input type="text" formControlName="idNumber"
                                   class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                   [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'idNumber')}" />
                            <div *ngIf="isFieldInvalid(kycShippingForm, 'idNumber')"
                                 class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'idNumber') }}
                            </div>
                        </div>
                    </div>

                    <h3 class="mb-4 text-xl font-semibold text-gray-800">KYC Document Uploads</h3>
                    <p class="mb-4 text-sm text-gray-500">Please upload the following required documents. Accepted
                        formats: PDF, PNG, JPG (Max 10MB each).</p>
                    <div *ngIf="kycDocuments.hasError('duplicateFiles') && kycDocuments.touched"
                         class="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                        <p>{{ getErrorMessage(kycShippingForm, 'kycDocuments') }}</p>
                    </div>
                    <div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 mb-6" formGroupName="kycDocuments">
                        <div>
                            <label for="idfUpload" class="block text-sm font-medium text-gray-700">IDF Document <span
                                class="text-red-500">*</span></label>
                            <div class="mt-1">
                                <input id="idfUpload" (change)="onFileSelected($event, 'idfUpload')" type="file"
                                       accept=".pdf,.jpg,.jpeg,.png"
                                       class="block w-full cursor-pointer rounded-md border border-gray-300 text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                       [ngClass]="{'border-red-500': hasKYCValidationError('idfUpload') }">
                                <span *ngIf="selectedFiles['idfUpload']" class="mt-2 block text-xs text-gray-500">Selected: {{ selectedFiles['idfUpload']?.name }}</span>
                            </div>
                            <div *ngIf="hasKYCValidationError('idfUpload')"
                                 class="mt-1 text-sm text-red-600">{{ getKYCValidationError('idfUpload') }}
                            </div>
                        </div>
                        <div>
                            <label for="invoiceUpload" class="block text-sm font-medium text-gray-700">Invoice <span
                                class="text-red-500">*</span></label>
                            <div class="mt-1">
                                <input id="invoiceUpload" (change)="onFileSelected($event, 'invoiceUpload')" type="file"
                                       accept=".pdf,.jpg,.jpeg,.png"
                                       class="block w-full cursor-pointer rounded-md border border-gray-300 text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                       [ngClass]="{'border-red-500': hasKYCValidationError('invoiceUpload') }">
                                <span *ngIf="selectedFiles['invoiceUpload']" class="mt-2 block text-xs text-gray-500">Selected: {{ selectedFiles['invoiceUpload']?.name }}</span>
                            </div>
                            <div *ngIf="hasKYCValidationError('invoiceUpload')"
                                 class="mt-1 text-sm text-red-600">{{ getKYCValidationError('invoiceUpload') }}
                            </div>
                        </div>
                        <div>
                            <label for="kraPinUpload" class="block text-sm font-medium text-gray-700">KRA PIN
                                Certificate <span class="text-red-500">*</span></label>
                            <div class="mt-1">
                                <input id="kraPinUpload" (change)="onFileSelected($event, 'kraPinUpload')" type="file"
                                       accept=".pdf,.jpg,.jpeg,.png"
                                       class="block w-full cursor-pointer rounded-md border border-gray-300 text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                       [ngClass]="{'border-red-500': hasKYCValidationError('kraPinUpload') }">
                                <span *ngIf="selectedFiles['kraPinUpload']" class="mt-2 block text-xs text-gray-500">Selected: {{ selectedFiles['kraPinUpload']?.name }}</span>
                            </div>
                            <div *ngIf="hasKYCValidationError('kraPinUpload')"
                                 class="mt-1 text-sm text-red-600">{{ getKYCValidationError('kraPinUpload') }}
                            </div>
                        </div>
                        <div>
                            <label for="nationalIdUpload" class="block text-sm font-medium text-gray-700">National ID
                                <span class="text-red-500">*</span></label>
                            <div class="mt-1">
                                <input id="nationalIdUpload" (change)="onFileSelected($event, 'nationalIdUpload')"
                                       type="file" accept=".pdf,.jpg,.jpeg,.png"
                                       class="block w-full cursor-pointer rounded-md border border-gray-300 text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                       [ngClass]="{'border-red-500': hasKYCValidationError('nationalIdUpload') }">
                                <span *ngIf="selectedFiles['nationalIdUpload']"
                                      class="mt-2 block text-xs text-gray-500">Selected: {{ selectedFiles['nationalIdUpload']?.name }}</span>
                            </div>
                            <div *ngIf="hasKYCValidationError('nationalIdUpload')"
                                 class="mt-1 text-sm text-red-600">{{ getKYCValidationError('nationalIdUpload') }}
                            </div>
                        </div>
                    </div>

                    <h3 class="mb-4 text-xl font-semibold text-gray-800 mt-6 border-t pt-6">Additional Shipment
                        Information</h3>
                    <div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">UCR Number</label>
                            <input type="text" formControlName="ucrNumber" placeholder="e.g. 12VNP011111123X0012345678"
                                   class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                   [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'ucrNumber')}" />
                            <div *ngIf="isFieldInvalid(kycShippingForm, 'ucrNumber')"
                                 class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'ucrNumber') }}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">IDF Number <span
                                class="text-red-500">*</span></label>
                            <input type="text" formControlName="idfNumber" placeholder="e.g. 12MBAIM1234567891"
                                   class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                   [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'idfNumber')}" />
                            <div *ngIf="isFieldInvalid(kycShippingForm, 'idfNumber')"
                                 class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'idfNumber') }}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Loading Port <span
                                class="text-red-500">*</span></label>
                            <select formControlName="loadingPort"
                                    class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                    [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'loadingPort')}">
                                <option value="" disabled>Select a port</option>
                                <option *ngFor="let port of loadingPortOptions" [value]="port.id">{{ port.portName }}
                                </option>
                            </select>
                            <div *ngIf="isFieldInvalid(kycShippingForm, 'loadingPort')"
                                 class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'loadingPort') }}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Port of Discharge <span
                                class="text-red-500">*</span></label>
                            <select formControlName="portOfDischarge"
                                    class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                    [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'portOfDischarge')}">
                                <option value="" disabled>Select a port</option>
                                <option *ngFor="let port of dischargePortOptions"
                                        [value]="port.id">{{ port.portName }}
                                </option>
                            </select>
                            <div *ngIf="isFieldInvalid(kycShippingForm, 'portOfDischarge')"
                                 class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'portOfDischarge') }}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Vessel Name</label>
                            <input type="text" formControlName="vesselName" placeholder="e.g., MSC Isabella"
                                   class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                   [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'vesselName')}" />
                            <div *ngIf="isFieldInvalid(kycShippingForm, 'vesselName')"
                                 class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'vesselName') }}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Final Destination (County in Kenya)
                                <span class="text-red-500">*</span></label>
                            <select formControlName="finalDestinationCounty"
                                    class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                    [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'finalDestinationCounty')}">
                                <option value="" disabled>Select a county</option>
                                <option *ngFor="let county of kenyanCounties"
                                        [value]="county.id">{{ county.portName }}
                                </option>
                            </select>
                            <div *ngIf="isFieldInvalid(kycShippingForm, 'finalDestinationCounty')"
                                 class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'finalDestinationCounty') }}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Date of Dispatch <span
                                class="text-red-500">*</span></label>
                            <input type="date" formControlName="dateOfDispatch" [min]="getToday()"
                                   class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                   [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'dateOfDispatch')}" />
                            <div *ngIf="isFieldInvalid(kycShippingForm, 'dateOfDispatch')"
                                 class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'dateOfDispatch') }}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Estimated Date of Arrival <span
                                class="text-red-500">*</span></label>
                            <input type="date" formControlName="estimatedArrivalDate" [min]="getToday()"
                                   class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                   [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'estimatedArrivalDate')}" />
                            <div *ngIf="isFieldInvalid(kycShippingForm, 'estimatedArrivalDate')"
                                 class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'estimatedArrivalDate') }}
                            </div>
                        </div>
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700">Description of Goods <span
                            class="text-red-500">*</span></label>
                        <textarea formControlName="descriptionOfGoods" rows="4"
                                  placeholder="Describe the type of goods, their value, quantity, packaging details..."
                                  class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                                  [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'descriptionOfGoods')}"></textarea>
                        <div *ngIf="isFieldInvalid(kycShippingForm, 'descriptionOfGoods')"
                             class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'descriptionOfGoods') }}
                        </div>
                    </div>
                    <div class="mb-6">
                        <label class="mb-1 block text-sm font-medium">Sum Insured (KES) <span
                            class="text-red-500">*</span></label>
                        <input type="text" formControlName="sumInsured" appThousands placeholder="e.g., 1,500,000"
                               inputmode="numeric"
                               class="w-full rounded-md border bg-white px-3 py-2 focus-ring-primary"
                               [ngClass]="{'border-red-500': isFieldInvalid(kycShippingForm, 'sumInsured')}" />
                        <div *ngIf="isFieldInvalid(kycShippingForm, 'sumInsured')"
                             class="mt-1 text-sm text-red-600">{{ getErrorMessage(kycShippingForm, 'sumInsured') }}
                        </div>
                    </div>

                    <fuse-alert
                        *ngIf="formErrorMessage"
                        [type]="'error'"
                        [appearance]="'outline'"
                        class="mb-4">
                        <span fuseAlertTitle>Error</span>
                        {{ formErrorMessage }}
                    </fuse-alert>
                    <div class="mt-8 flex flex-col sm:flex-row justify-end gap-4 border-t pt-6">
                        <button type="button" (click)="closeDialog('quote_saved_and_closed')" class="btn-primary">Close
                            (Save Quote)
                        </button>
                        <button type="submit" (click)="submitKycShippingDetails()" class="btn-primary"
                                [disabled]="kycShippingForm.invalid || isSubmitting">
                            <span *ngIf="isSubmitting"
                                  class="animate-spin mr-2 inline-block h-5 w-5 rounded-full border-b-2 border-white"></span>
                            {{ isSubmitting ? 'Submitting...' : 'Submit & Pay' }}
                        </button>
                    </div>
                </form>
            </mat-dialog-content>
        </div>
    `,
    styles: [`
        .modal-container {
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            max-width: 800px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            background-color: #21275c;
            color: white;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .modal-title {
            font-size: 20px;
            font-weight: 600;
            margin: 0;
            color: white;
        }

        .close-button {
            color: rgba(255, 255, 255, 0.7);
        }

        .close-button:hover {
            color: white;
        }

        .modal-content {
            flex-grow: 1;
            overflow-y: auto;
            padding: 0 !important;
        }

        .modal-content form input, .modal-content form select, .modal-content form textarea {
            color: #1f2937;
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.75rem 1.5rem;
            font-weight: 500;
            color: white;
            background-color: #04b2e1;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
            background-color: #21275c;
        }

        .btn-primary:disabled {
            background-color: #9ca3af;
            cursor: not-allowed;
            opacity: 0.7;
        }

        @media (max-width: 767px) {
            .modal-container {
                border-radius: 0;
            }
        }
    `],
})
export class KycShippingPaymentModalComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    kycShippingForm: FormGroup;
    isSubmitting: boolean = false;
    selectedFiles: { [key: string]: File | null } = {
        kraPinUpload: null,
        nationalIdUpload: null,
        invoiceUpload: null,
        idfUpload: null,
    };
    private kycFileValidationErrors: { [key: string]: string } = {};
    loadingPortOptions: PortData[] = [];
    dischargePortOptions: PortData[] = [];
    kenyanCounties: County[] = [];
    formErrorMessage: string = null;

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<KycShippingPaymentModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialog: MatDialog,
        private datePipe: DatePipe,
        private quotationService: QuoteService,
        private userService: UserService,
        private router: Router,
    ) {
        this.kycShippingForm = this.createKycShippingForm();
    }

    ngOnInit(): void {
        this.patchFormWithQuoteData();
        this.setupKYCFileValidation();
        this.setDefaultDates();
        this.userService.getCounties(0, 100).subscribe({
            next: (res) => {
                this.kenyanCounties = res.pageItems;
            },
            error: (err) => {
                console.error('Error loading counties:', err);
            },
        });
        let countryId: number = this.data.shippingmodeId === 1 ? 116 : 43;
        forkJoin({
            countis: this.userService.getCounties(0, 100),
            ports: this.userService.getPorts(this.data.originCountry, this.data.shippingmodeId, 0, 800),
            destports: this.userService.getPorts(countryId, this.data.shippingmodeId, 0, 500),
        }).subscribe({
            next: (data) => {
                this.kenyanCounties = data.countis.pageItems || [];
                this.loadingPortOptions = data.ports.pageItems || [];
                this.dischargePortOptions = data.destports.pageItems || [];
            },
            error: (err) => {
                console.error('Error loading marine data:', err);
            },
        });
        this.kycShippingForm.get('sumInsured')?.setValue(this.data.sumassured, { emitEvent: false });
        this.kycShippingForm.get('kraPin')?.setValue(this.data.pinNo, { emitEvent: false });
        this.kycShippingForm.get('idNumber')?.setValue(this.data.idNumber, { emitEvent: false });
        if (this.data.pinNo) {
            this.kycShippingForm.get('kraPin')?.disable();
        }
        if (this.data.idNumber) {
            this.kycShippingForm.get('idNumber')?.disable();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private createKycShippingForm(): FormGroup {
        const allowedFileTypes = ['pdf', 'png', 'jpg', 'jpeg'];
        const maxFileSize = 10;
        return this.fb.group({
            kraPin: ['', [Validators.required, kraPinValidator]],
            idNumber: ['', [Validators.required, idNumberValidator]],
            kycDocuments: this.fb.group({
                kraPinUpload: [null, [Validators.required, enhancedFileTypeValidator(allowedFileTypes, maxFileSize)]],
                nationalIdUpload: [null, [Validators.required, enhancedFileTypeValidator(allowedFileTypes, maxFileSize)]],
                invoiceUpload: [null, [Validators.required, enhancedFileTypeValidator(allowedFileTypes, maxFileSize)]],
                idfUpload: [null, [Validators.required, enhancedFileTypeValidator(allowedFileTypes, maxFileSize)]],
            }, { validators: enhancedDuplicateFileValidator }),
            ucrNumber: ['', ucrNumberValidator],
            idfNumber: ['', [Validators.required, idfNumberValidator]],
            loadingPort: ['', Validators.required],
            portOfDischarge: ['', Validators.required],
            sumInsured: ['', Validators.required],
            vesselName: [''],
            finalDestinationCounty: ['', Validators.required],
            dateOfDispatch: ['', [Validators.required, this.noPastDatesValidator]],
            estimatedArrivalDate: ['', [Validators.required, this.noPastDatesValidator]],
            descriptionOfGoods: ['', [Validators.required, minWords(3), maxWords(100)]],
        });
    }

    private patchFormWithQuoteData(): void {
        this.setDefaultDates();
    }

    private setDefaultDates(): void {
        const today = this.getToday();
        if (!this.kycShippingForm.get('dateOfDispatch')?.value) {
            this.kycShippingForm.get('dateOfDispatch')?.setValue(today);
        }
        if (!this.kycShippingForm.get('estimatedArrivalDate')?.value) {
            const oneWeekFromNow = new Date();
            oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
            this.kycShippingForm.get('estimatedArrivalDate')?.setValue(oneWeekFromNow.toISOString().split('T')[0]);
        }
    }

    get shippingItems(): FormArray {
        return this.kycShippingForm.get('shippingItems') as FormArray;
    }

    get kycDocuments(): FormGroup {
        return this.kycShippingForm.get('kycDocuments') as FormGroup;
    }

    createShippingItem(): FormGroup {
        return this.fb.group({
            itemName: ['', Validators.required],
            quantity: [1, [Validators.required, Validators.min(1)]],
            unitCost: [null, [Validators.required, Validators.min(0)]],
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

    onFileSelected(event: Event, controlName: string): void {
        const input = event.target as HTMLInputElement;
        const file = input.files ? input.files[0] : null;

        const control = this.kycDocuments.get(controlName);
        if (control) {
            control.setValue(file);
            control.markAsDirty();
            control.updateValueAndValidity({ emitEvent: true });

            this.selectedFiles = { ...this.selectedFiles, [controlName]: file };
        }
        this.validateAllKYCFiles();
    }

    private getFieldDisplayName(controlName: string): string {
        switch (controlName) {
            case 'kraPinUpload':
                return 'KRA PIN Certificate';
            case 'nationalIdUpload':
                return 'National ID';
            case 'invoiceUpload':
                return 'Invoice';
            case 'idfUpload':
                return 'IDF Document';
            default:
                return controlName;
        }
    }

    private setupKYCFileValidation(): void {
        Object.keys(this.kycDocuments.controls).forEach(controlName => {
            this.kycDocuments.get(controlName)?.statusChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe(status => {
                    const control = this.kycDocuments.get(controlName);
                    if (control && control.invalid && (control.dirty || control.touched)) {
                        this.handleControlValidationErrors(controlName, control.errors || {});
                    } else {
                        delete this.kycFileValidationErrors[controlName];
                    }
                });
        });

        this.kycDocuments.statusChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(status => {
                if (status === 'INVALID' && this.kycDocuments.errors?.['duplicateFiles']) {
                    const duplicatedControls = this.kycDocuments.errors['duplicateFiles'].duplicatedControls;
                    duplicatedControls.forEach((c: string) => {
                        this.handleControlValidationErrors(c, { duplicateFiles: true });
                    });
                    Object.keys(this.kycFileValidationErrors).forEach(key => {
                        if (!duplicatedControls.includes(key) && this.kycFileValidationErrors[key].includes('duplicate')) {
                            delete this.kycFileValidationErrors[key];
                        }
                    });
                } else {
                    Object.keys(this.kycFileValidationErrors).forEach(key => {
                        if (this.kycFileValidationErrors[key].includes('duplicate')) {
                            delete this.kycFileValidationErrors[key];
                        }
                    });
                }
            });
    }

    private validateAllKYCFiles(): void {
        Object.keys(this.kycDocuments.controls).forEach(controlName => {
            this.kycDocuments.get(controlName)?.markAsTouched();
            this.kycDocuments.get(controlName)?.updateValueAndValidity();
        });
        this.kycDocuments.updateValueAndValidity();
    }

    private handleControlValidationErrors(controlName: string, errors: ValidationErrors): void {
        if (errors['required']) {
            this.kycFileValidationErrors[controlName] = `${this.getFieldDisplayName(controlName)} is required.`;
        } else if (errors['invalidFileType']) {
            this.kycFileValidationErrors[controlName] = `Invalid file type. Allowed: ${errors['invalidFileType'].allowed}.`;
        } else if (errors['fileTooLarge']) {
            this.kycFileValidationErrors[controlName] = `File too large. Max size: ${errors['fileTooLarge'].maxSize}MB.`;
        } else if (errors['duplicateFiles']) {
            this.kycFileValidationErrors[controlName] = `This document is a duplicate of another uploaded document.`;
        } else {
            delete this.kycFileValidationErrors[controlName];
        }
    }

    hasKYCValidationError(controlName: string): boolean {
        const control = this.kycDocuments.get(controlName);
        return !!this.kycFileValidationErrors[controlName] || (!!control && control.invalid && (control.dirty || control.touched));
    }

    getKYCValidationError(controlName: string): string {
        const control = this.kycDocuments.get(controlName);
        if (this.kycFileValidationErrors[controlName]) {
            return this.kycFileValidationErrors[controlName];
        }
        return this.getErrorMessage(this.kycDocuments, controlName);
    }

    clearAllKYCFiles(): void {
        Object.keys(this.selectedFiles).forEach(key => {
            this.selectedFiles[key] = null;
            this.kycDocuments.get(key)?.reset(null);
        });
        this.kycFileValidationErrors = {};
        this.kycDocuments.reset();
    }

    submitKycShippingDetails(): void {
        this.isSubmitting = true;
        this.kycShippingForm.markAllAsTouched();
        this.kycDocuments.markAllAsTouched();

        if (!this.kycShippingForm.valid) {
            console.error('KYC/Shipping form is invalid');
            this.showToast('Please fill in all required fields and upload all documents correctly.');
            this.scrollToFirstError();
            this.isSubmitting = false;
            return;
        }

        const kycFormValue = this.kycShippingForm.value;

        const formData = new FormData();
        const kycDocs = this.kycDocuments.value;
        formData.append('kraPinUpload', kycDocs.kraPinUpload);
        formData.append('nationalIdUpload', kycDocs.nationalIdUpload);
        formData.append('invoiceUpload', kycDocs.invoiceUpload);
        formData.append('idfUpload', kycDocs.idfUpload);

        const updatedMetadata = {
            quoteId: this.data.quoteId,
            suminsured: kycFormValue.sumInsured,
            kraPin: kycFormValue.kraPin,
            idNumber: kycFormValue.idNumber,
            ucrnumber: kycFormValue.ucrNumber,
            idfnumber: kycFormValue.idfNumber,
            vesselname: kycFormValue.vesselName,
            loadingPort: kycFormValue.loadingPort,
            portOfDischarge: kycFormValue.portOfDischarge,
            finalDestinationCounty: kycFormValue.finalDestinationCounty,
            dateOfDispatch: this.datePipe.transform(kycFormValue.dateOfDispatch, 'dd MMM yyyy'),
            estimatedArrivalDate: this.datePipe.transform(kycFormValue.estimatedArrivalDate, 'dd MMM yyyy'),
            description: kycFormValue.descriptionOfGoods,
            // shippingItems: kycFormValue.shippingItems,
            dateFormat: 'dd MMM yyyy',
            locale: 'en_US',
        };

        formData.append('metadata', JSON.stringify(updatedMetadata));
        this.quotationService.createApplication(formData).subscribe({
            next: (res) => {
                this.showToast('Quote details updated. Proceeding to payment.');
                this.openPaymentModal(res.commandId);
                this.isSubmitting = false;
                this.formErrorMessage = null;
            },
            error: (err) => {
                console.error('Application creation error:', err);
                this.formErrorMessage = 'Application creation error:' + err?.error?.errors[0].defaultUserMessage;
                this.isSubmitting = false;
            },
        });
    }

    private openPaymentModal(shippingId): void {
        this.userService.getShippingData(shippingId).subscribe(data => {
            const isMobile = window.innerWidth < 480;
            const dialogRef = this.dialog.open(PaymentModalComponent, {
                width: isMobile ? '95vw' : '450px',
                maxWidth: '95vw',
                data: {
                    amount: data.netpremium,
                    phoneNumber: this.data.phoneNumber,
                    reference: data.refno,
                    description: `Marine Cargo Insurance for Quote ${data.refno}`,
                },
                disableClose: true,
            });

            dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((paymentResult: PaymentResult | null) => {
                if (paymentResult?.success) {
                    this.showToast('Payment successful!');
                    this.dialogRef.close('payment_success');
                } else {
                    this.showToast('Payment cancelled or failed. Your quote has been saved.');
                    this.dialogRef.close('payment_failed');
                }
            });
        });
    }

    closeDialog(result: 'quote_saved_and_closed' | 'payment_success' | 'payment_failed' | null = null): void {
        this.dialogRef.close(result);
    }

    isFieldInvalid(form: AbstractControl, field: string): boolean {
        const control = form.get(field);
        return !!control && control.invalid && (control.dirty || control.touched);
    }

    getErrorMessage(form: AbstractControl, field: string): string {
        const control = form.get(field);
        if (field === 'kycDocuments' && control?.hasError('duplicateFiles')) {
            return 'You cannot upload the same document for multiple fields.';
        }
        if (!control || !control.errors) return '';
        if (control.hasError('required')) return 'This field is required.';
        if (control.hasError('email')) return 'Please enter a valid email address.';
        if (control.hasError('requiredTrue')) return 'You must agree to proceed.';
        if (control.hasError('pastDate')) return 'Date cannot be in the past.';
        if (control.hasError('min')) return 'Value must be greater than 0.';
        if (control.hasError('invalidKraPin')) return 'Invalid KRA PIN. Format: A123456789Z.';
        if (control.hasError('invalidPhoneNumber')) return 'Invalid phone number. Format: +254712345678.';
        if (control.hasError('invalidIdNumber')) return 'Invalid ID. Must be 7 or 8 numerals.';
        if (control.hasError('invalidName')) return 'Name can only contain letters, spaces, and hyphens.';
        if (control.hasError('minWords')) return `Minimum of ${control.errors['minWords'].requiredWords} words is required.`;
        if (control.hasError('maxWords')) return `Maximum of ${control.errors['maxWords'].maxWords} words is allowed.`;
        if (control.hasError('invalidIdfNumber')) return 'Invalid IDF Number. Format: 12MBAIM1234567891.';
        if (control.hasError('invalidUcrNumber')) return 'Invalid UCR Number. Format: 12VNP011111123X0012345678.';
        return 'This field has an error.';
    }

    noPastDatesValidator(control: AbstractControl): { [key: string]: boolean } | null {
        if (!control.value) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const controlDate = new Date(control.value);
        return controlDate < today ? { pastDate: true } : null;
    }

    getToday(): string {
        return new Date().toISOString().split('T')[0];
    }

    private scrollToFirstError(): void {
        setTimeout(() => {
            const firstErrorElement = document.querySelector('.ng-invalid.ng-touched');
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    private showToast(message: string): void {
        console.log('Toast (KycShippingPaymentModal):', message);
    }
}


@Component({
    selector: 'app-marine-cargo-quotation',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, CurrencyPipe, DecimalPipe, MatDialogModule, MatIconModule, TitleCasePipe, ThousandsSeparatorValueAccessor, TermsPrivacyModalComponent, PaymentModalComponent, KycShippingPaymentModalComponent],
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
    page = 0;
    pageSize = 200;
    premiumCalculation: PremiumCalculation = this.resetPremiumCalculation();
    private editModeQuoteId: string | null = null;
    user: EnhancedStoredUser | null = null;
    isLoggedIn: boolean = false;
    quoteResult: QuoteResult | null = null;
    displayUser: DisplayUser = { type: 'individual', name: 'Individual User' };
    isLoadingMarineData: boolean = true;
    isLoadingCargoTypes: boolean = true;
    marineProducts: MarineProduct[] = [];
    marinePackagingTypes: PackagingType[] = [];
    marineCategories: Category[] = [];
    marineCargoTypes: CargoTypeData[] = [];
    readonly blacklistedCountries: string[] = ['Russia', 'Ukraine', 'North Korea', 'Syria', 'Iran', 'Yemen', 'Sudan', 'Somalia'];
    readonly allCountriesList: string[] = ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Canada', 'China', 'Denmark', 'Egypt', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Kenya', 'Mexico', 'Netherlands', 'New Zealand', 'Nigeria', 'North Korea', 'Norway', 'Pakistan', 'Russia', 'Saudi Arabia', 'Somalia', 'South Africa', 'Spain', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Tanzania', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States of America', 'Yemen', 'Zambia', 'Zimbabwe'].sort();
    filteredCountriesList: Country[] = [];
    exportDestinationCountries: string[] = [];
    readonly portOptions: string[] = ['Lamu', 'Mombasa', 'Kisumu'];
    kenyanCounties: County[] = [];
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
        private quotationService: QuoteService,
    ) {

        this.exportRequestForm = this.createExportRequestForm();
        this.highRiskRequestForm = this.createHighRiskRequestForm();
        this.exportDestinationCountries = this.allCountriesList.filter(c => c !== 'Kenya');
    }

    ngOnInit(): void {
        this.quotationForm = this.createQuotationForm();
        this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
            this.isLoggedIn = !!user;
            if (this.isLoggedIn) {
                this.user = user as EnhancedStoredUser;
                console.log(this.user);
            } else {
                this.user = null;
            }
        });
        this.isLoadingMarineData = true;
        forkJoin({
            products: this.userService.getMarineProducts(),
            packagingTypes: this.userService.getMarinePackagingTypes(),
            categories: this.userService.getMarineCategories(),
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
            },
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
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private createQuotationForm(): FormGroup {
        return this.fb.group({
            firstName: ['', [Validators.required, nameValidator]],
            lastName: ['', [Validators.required, nameValidator]],
            email: ['', [Validators.required, Validators.email]],
            phoneNumber: ['', [Validators.required, kenyanPhoneNumberValidator]],
            modeOfShipment: ['', Validators.required],
            marineProduct: ['ICC (A) All Risks'],
            marineCategory: ['ICC (A) All Risks', Validators.required],
            marineCargoType: ['', Validators.required],
            marinePackagingType: ['', Validators.required],
            tradeType: ['', Validators.required],
            origin: ['', Validators.required],
            destination: ['Kenya'],
            selfAsImporter: [false],
            sumInsured: [null, [Validators.required, Validators.min(1)]],
            termsAndPolicyConsent: [false, Validators.requiredTrue],
        });
    }


    onSubmit(): void {
        this.isSaving = true;
        this.quotationForm.markAllAsTouched();

        if (!this.quotationForm.valid) {
            this.showToast('Please fill in all required fields correctly');
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

        const metadata = {
            suminsured: this.quotationForm.get('sumInsured')?.value,
            firstName: this.quotationForm.get('firstName')?.value,
            lastName: this.quotationForm.get('lastName')?.value,
            email: this.quotationForm.get('email')?.value,
            phoneNumber: this.quotationForm.get('phoneNumber')?.value,
            shippingid: this.quotationForm.get('modeOfShipment')?.value,
            tradeType: this.quotationForm.get('tradeType')?.value,
            countryOrigin: this.quotationForm.get('origin')?.value,
            destination: this.quotationForm.get('destination')?.value,
            dateFormat: 'dd MMM yyyy',
            locale: 'en_US',
            productId: 2416,
            packagetypeid: packagingType,
            categoryid: selectedCategory?.id,
            cargoId: selectedCargoType?.id,
        };

        const formData = new FormData();
        // const kycDocs = this.kycDocuments.value;
        // formData.append('kraPinUpload', kycDocs.kraPinUpload);
        // formData.append('nationalIdUpload', kycDocs.nationalIdUpload);
        // formData.append('invoiceUpload', kycDocs.invoiceUpload);
        // formData.append('idfUpload', kycDocs.idfUpload);
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
            },
        });
    }

    displayImporterForm = true;

    onSelfAsImporterChange(event: Event) {
        const checked = (event.target as HTMLInputElement).checked;
        if (checked) {
            this.displayImporterForm = false;
            this.quotationForm.get('firstName')?.setValue('one', { emitEvent: false });
            this.quotationForm.get('lastName')?.setValue('two', { emitEvent: false });
            this.quotationForm.get('email')?.setValue('three@test.com', { emitEvent: false });
            this.quotationForm.get('phoneNumber')?.setValue('+254722123456', { emitEvent: false });
        } else {
            this.displayImporterForm = true;
            this.quotationForm.get('firstName')?.setValue('', { emitEvent: false });
            this.quotationForm.get('lastName')?.setValue('', { emitEvent: false });
            this.quotationForm.get('email')?.setValue('', { emitEvent: false });
            this.quotationForm.get('phoneNumber')?.setValue('', { emitEvent: false });
        }
    }

    private setupFormSubscriptions(): void {
        this.quotationForm.get('tradeType')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((type) => {
            if (type === '2') {
                this.exportRequestForm.patchValue(this.quotationForm.value);
                this.showExportModal = true;
            }
        });
        this.quotationForm.get('origin')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((country) => {
            if (country && this.blacklistedCountries.includes(country)) {
                this.highRiskRequestForm.patchValue(this.quotationForm.value);
                this.highRiskRequestForm.patchValue({ originCountry: country });
                this.showHighRiskModal = true;
            }
        });
        this.quotationForm.valueChanges.pipe(debounceTime(1000), takeUntil(this.destroy$)).subscribe(value => {
            this.saveQuoteToLocalStorage(value);
        });

        this.quotationForm.get('modeOfShipment')?.valueChanges.subscribe((mode: number) => {
            if (mode) {
                console.log('Mode of Shipment selected:', mode);

                // Example: Call your API with mode as "type"
                this.userService.getCountries(0, 300, mode).subscribe({
                    next: (res) => {
                        this.filteredCountriesList = res.pageItems;
                    },
                    error: (err) => {
                        console.error('Error loading countries:', err);
                    },
                });
            }
        });
    }

    onCategorySelected(event: Event) {
        const categoryName = (event.target as HTMLSelectElement).value;
        const selectedCategory = this.marineCategories.find(c => c.catname === categoryName);

        if (selectedCategory) {
            this.isLoadingCargoTypes = true;
            this.userService.getCargoTypesByCategory(selectedCategory.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (cargoTypes) => {
                        this.marineCargoTypes = cargoTypes || [];
                        this.isLoadingCargoTypes = false;
                        const currentCargoType = this.quotationForm.get('marineCargoType')?.value;
                        if (currentCargoType && !this.marineCargoTypes.some(ct => ct.ctname === currentCargoType)) {
                            this.quotationForm.get('marineCargoType')?.setValue('', { emitEvent: false });
                        }
                    },
                    error: (err) => {
                        console.error('Error loading marine cargo types:', err);
                        this.marineCargoTypes = [];
                        this.isLoadingCargoTypes = false;
                    },
                });
        } else {
            this.marineCargoTypes = [];
            this.quotationForm.get('marineCargoType')?.setValue('', { emitEvent: false });
        }
    }

    private saveQuoteToLocalStorage(formValue: any): void {
        localStorage.setItem(this.quoteStorageKey, JSON.stringify(formValue));
    }

    private loadQuoteFromLocalStorage(): void {
        // const savedQuoteJSON = localStorage.getItem(this.quoteStorageKey);
        // if (savedQuoteJSON) {
        //     const savedQuote = JSON.parse(savedQuoteJSON);
        //     this.quotationForm.patchValue(savedQuote);
        //     this.showToast('Your previous progress has been restored.');
        // }
    }

    openTermsModal(event?: Event): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.showTermsModal = true;
    }

    closeTermsModal(): void {
        this.showTermsModal = false;
    }

    openPrivacyModal(event?: Event): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.showPrivacyModal = true;
    }

    closePrivacyModal(): void {
        this.showPrivacyModal = false;
    }

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

    isFieldInvalid(form: FormGroup, field: string): boolean {
        const control = form.get(field);
        return !!control && control.invalid && (control.dirty || control.touched);
    }

    getErrorMessage(form: FormGroup, field: string): string {
        const control = form.get(field);
        if (!control || !control.errors) return '';
        if (control.hasError('required')) return 'This field is required.';
        if (control.hasError('email')) return 'Please enter a valid email address.';
        if (control.hasError('requiredTrue')) return 'You must agree to proceed.';
        if (control.hasError('pastDate')) return 'Date cannot be in the past.';
        if (control.hasError('min')) return 'Value must be greater than 0.';
        if (control.hasError('invalidKraPin')) return 'Invalid KRA PIN. Format: A123456789Z.';
        if (control.hasError('invalidPhoneNumber')) return 'Invalid phone number. Format: +254712345678.';
        if (control.hasError('invalidIdNumber')) return 'Invalid ID. Must be 7 or 8 numerals.';
        if (control.hasError('invalidName')) return 'Name can only contain letters, spaces, and hyphens.';
        if (control.hasError('minWords')) return `Minimum of ${control.errors['minWords'].requiredWords} words is required.`;
        if (control.hasError('maxWords')) return `Maximum of ${control.errors['maxWords'].maxWords} words is allowed.`;

        return 'This field has an error.';
    }

    noPastDatesValidator(control: AbstractControl): { [key: string]: boolean } | null {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const controlDate = new Date(control.value);
        return controlDate < today ? { pastDate: true } : null;
    }

    private createModalForm(): FormGroup {
        return this.fb.group({
            firstName: ['', [Validators.required, nameValidator]],
            lastName: ['', [Validators.required, nameValidator]],
            email: ['', [Validators.required, Validators.email]],
            phoneNumber: ['', [Validators.required, kenyanPhoneNumberValidator]],
            originCountry: ['', Validators.required],
            destinationCountry: ['', Validators.required],
            shipmentDate: ['', [Validators.required, this.noPastDatesValidator]],
            sumInsured: [null, [Validators.required, Validators.min(1)]],
            goodsDescription: ['', [Validators.required, minWords(3), maxWords(100)]],
            termsAndPolicyConsent: [false, Validators.requiredTrue],
        });
    }

    private createExportRequestForm(): FormGroup {
        const form = this.createModalForm();
        form.get('originCountry')?.patchValue('Kenya');
        form.get('originCountry')?.disable();
        return form;
    }

    private createHighRiskRequestForm(): FormGroup {
        const form = this.createModalForm();
        form.get('destinationCountry')?.patchValue('Kenya');
        form.get('destinationCountry')?.disable();
        return form;
    }

    onExportRequestSubmit(): void {
        if (this.exportRequestForm.valid) {
            this.closeAllModals();
            this.showToast('Export request submitted. Our underwriter will contact you.');
        } else {
            this.exportRequestForm.markAllAsTouched();
            this.showToast('Please fill in all required fields correctly.');
        }
    }

    onHighRiskRequestSubmit(): void {
        if (this.highRiskRequestForm.valid) {
            this.closeAllModals();
            this.showToast('High-risk request submitted for manual review.');
        } else {
            this.highRiskRequestForm.markAllAsTouched();
            this.showToast('Please fill in all required fields correctly.');
        }
    }

    closeAllModals(): void {
        this.showExportModal = false;
        this.showHighRiskModal = false;
        this.quotationForm.get('tradeType')?.setValue('1', { emitEvent: false });
        this.quotationForm.get('origin')?.setValue('', { emitEvent: false });
        this.exportRequestForm.reset({ originCountry: 'Kenya' });
        this.highRiskRequestForm.reset({ destinationCountry: 'Kenya' });
    }

    private loadQuoteForEditing(quoteId: string): void {
        this.showToast(`Editing for quote ${quoteId} is not yet implemented.`);
        this.loadQuoteFromLocalStorage();
    }

    handlePayment(): void {
        if (this.isLoggedIn) {
            if (!this.quoteResult || !this.quoteResult.id) {
                this.showToast('Error: No quote available for payment. Please generate a quote first.');
                return;
            }
            this.userService.getSingleQuote(this.quoteResult.id).subscribe(data => {
                this.openKycShippingPaymentModal(data.quoteId,data.originCountry,data.shippingmodeId,data.sumassured,data.pinNumber,data.idNumber,data.status,
                    data.phoneNo,data.netprem,data.refno);
            });



        } else {
            this.showToast('Please log in or register to complete your purchase.');
            setTimeout(() => {
                this.router.navigate(['/']);
            }, 2500);
        }
    }

    private openKycShippingPaymentModal(quoteId: number,originCountry:string,shippingmodeId:number,sumassured:number,pinNo: string,idNo: string,status:string,phone:string,prem:number,refno:string): void {
        const isMobile = window.innerWidth < 768;
        this.dialog.open(KycShippingPaymentModalComponent, {
            width: isMobile ? '100vw' : '800px',
            maxWidth: isMobile ? '100vw' : '90vw',
            height: isMobile ? '100vh' : 'auto',
            maxHeight: isMobile ? '100vh' : '90vh',
            panelClass: ['payment-modal', ...(isMobile ? ['mobile-modal'] : [])],
            data: {quoteId:quoteId,originCountry:originCountry,shippingmodeId:shippingmodeId,sumassured:sumassured,pinNo:pinNo,idNo:idNo},
            disableClose: true,
            hasBackdrop: true,
            backdropClass: 'payment-modal-backdrop',
            // Add these mobile-specific options
            ...(isMobile && {
                position: { top: '0px', left: '0px' },
                autoFocus: false,
                restoreFocus: false
            })
        });
    }

    private saveQuoteToDashboard(quote: QuoteResult): void {
        if (this.user) {
            console.log(`Quote ${quote.id} (KES ${quote.netprem}) saved to dashboard for user ${this.user.uid}`);
        } else {
            console.warn('Attempted to save quote to dashboard but user is not logged in or uid is not available.');
        }
    }

    closeForm(): void {
        if (this.isLoggedIn) {
            this.router.navigate(['/sign-up/dashboard']);
            if (this.currentStep === 2 && this.quoteResult) {
                this.showToast('Quote saved to dashboard. Returning to dashboard.');
            } else {
                this.showToast('Returning to dashboard.');
            }
        } else {
            this.router.navigate(['/']);
        }
    }

    logout(): void {
        this.authService.logout();
        this.showToast('You have been logged out successfully.');
        setTimeout(() => {
            this.router.navigate(['/']);
        }, 1500);
    }

    private resetPremiumCalculation(): PremiumCalculation {
        return {
            basePremium: 0,
            phcf: 0,
            trainingLevy: 0,
            stampDuty: 0,
            commission: 0,
            totalPayable: 0,
            currency: 'KES',
        };
    }

    downloadQuote(): void {
        if (this.quoteResult?.id) {
            this.userService.downloadQuote(this.quoteResult?.id).subscribe(base64String => {
                console.log('Base64 response:', base64String);
                const base64 = base64String.split(',')[1] || base64String;

                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'quote.pdf'; // 👈 file name
                a.click();
                window.URL.revokeObjectURL(url);
            });
            this.showToast('Quote download initiated successfully. Check your downloads for the document.');
        } else {
            this.showToast('No quote available to download.');
        }
    }

    getToday(): string {
        return new Date().toISOString().split('T')[0];
    }

    goToStep(step: number): void {
        this.currentStep = step;
    }
}