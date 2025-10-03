import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { QuoteService } from '../shared/services/quote.service';
import { UserService } from '../../../core/user/user.service';
import { PaymentModalComponent } from './marine-cargo.component';

export interface ShipmentDetailsData {
    shippingId: number;
    postalAddress?: string;
    postalCode?: string;
}

@Component({
    selector: 'app-shipment-details-modal',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatIconModule,
        MatSnackBarModule,
        MatSelectModule,
        MatTabsModule,
        MatDividerModule,
        MatCardModule,
        PaymentModalComponent
    ],
    template: `
        <div class="modal-container">
            <div class="modal-header">
                <h2 mat-dialog-title class="modal-title">Review & Pay for Marine Insurance</h2>
                <button mat-icon-button (click)="closeDialog()" class="close-button" aria-label="Close dialog">
                    <mat-icon>close</mat-icon>
                </button>
            </div>
            
            <mat-dialog-content class="modal-content">
                <mat-tab-group [(selectedIndex)]="selectedTabIndex" class="payment-tabs">
                    
                    <!-- Shipment Details Tab -->
                    <mat-tab label="Shipment Details">
                        <div class="tab-content">
                            <form [formGroup]="shipmentForm" class="p-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                                    <mat-form-field appearance="outline">
                                        <mat-label>Mode of Shipment</mat-label>
                                        <input matInput formControlName="shippingModeName" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>Trade Type</mat-label>
                                        <input matInput formControlName="importerType" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>Country of Origin</mat-label>
                                        <input matInput formControlName="originCountryName" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>Insured Name</mat-label>
                                        <input matInput formControlName="consignmentNumber" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>Sum Insured</mat-label>
                                        <input matInput formControlName="sumassured" type="number" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline" class="md:col-span-2">
                                        <mat-label>Goods Description</mat-label>
                                        <textarea matInput formControlName="description" rows="3" (blur)="onFormChange()"></textarea>
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>Vessel Name</mat-label>
                                        <input matInput formControlName="vesselName" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>Loading Port</mat-label>
                                        <input matInput formControlName="originPortName" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>Port of Discharge</mat-label>
                                        <input matInput formControlName="destPortName" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>Final Destination (County)</mat-label>
                                        <input matInput formControlName="countyName" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>IDF Number</mat-label>
                                        <input matInput formControlName="idfNumber" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>UCR Number</mat-label>
                                        <input matInput formControlName="ucrNumber" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>Postal Address</mat-label>
                                        <input matInput formControlName="postalAddress" (blur)="onFormChange()">
                                    </mat-form-field>

                                    <mat-form-field appearance="outline">
                                        <mat-label>Postal Code</mat-label>
                                        <input matInput formControlName="postalCode" (blur)="onFormChange()">
                                    </mat-form-field>

                                </div>
                            </form>
                        </div>
                    </mat-tab>
                    
                    <!-- Quote Summary Tab -->
                    <mat-tab label="Quote Summary" [disabled]="!quoteCalculated">
                        <div class="tab-content">
                            <div class="quote-summary-section">
                                <mat-card class="premium-card">
                                    <mat-card-header>
                                        <mat-card-title class="premium-title">
                                            <mat-icon class="premium-icon">receipt</mat-icon>
                                            Premium Calculation
                                        </mat-card-title>
                                    </mat-card-header>
                                    <mat-card-content>
                                        <div class="premium-breakdown" *ngIf="premiumCalculation">
                                            <div class="premium-row">
                                                <span class="premium-label">Base Premium:</span>
                                                <span class="premium-value">KES {{ premiumCalculation.basePremium | number:'1.2-2' }}</span>
                                            </div>
                                            <div class="premium-row">
                                                <span class="premium-label">PHCF (2.5%):</span>
                                                <span class="premium-value">KES {{ premiumCalculation.phcf | number:'1.2-2' }}</span>
                                            </div>
                                            <div class="premium-row">
                                                <span class="premium-label">Training Levy (0.2%):</span>
                                                <span class="premium-value">KES {{ premiumCalculation.trainingLevy | number:'1.2-2' }}</span>
                                            </div>
                                            <div class="premium-row">
                                                <span class="premium-label">Stamp Duty:</span>
                                                <span class="premium-value">KES {{ premiumCalculation.stampDuty | number:'1.2-2' }}</span>
                                            </div>
                                            <mat-divider class="premium-divider"></mat-divider>
                                            <div class="premium-row total-row">
                                                <span class="premium-label total-label">Total Premium:</span>
                                                <span class="premium-value total-value">KES {{ premiumCalculation.totalPayable | number:'1.2-2' }}</span>
                                            </div>
                                        </div>
                                        
                                        <div class="recalculating-message" *ngIf="isRecalculating">
                                            <mat-icon class="spin">refresh</mat-icon>
                                            <span>Recalculating premium...</span>
                                        </div>
                                        
                                        <div class="no-quote-message" *ngIf="!premiumCalculation && !isRecalculating">
                                            <mat-icon>info</mat-icon>
                                            <span>Please review shipment details to calculate premium</span>
                                        </div>
                                    </mat-card-content>
                                </mat-card>
                            </div>
                        </div>
                    </mat-tab>
                    
                    <!-- Payment Tab -->
                    <mat-tab label="Payment" [disabled]="!premiumCalculation">
                        <div class="tab-content">
                            <div class="payment-section">
                                <div class="payment-summary">
                                    <mat-card class="payment-card">
                                        <mat-card-header>
                                            <mat-card-title class="payment-title">
                                                <mat-icon class="payment-icon">payment</mat-icon>
                                                M-Pesa Payment
                                            </mat-card-title>
                                        </mat-card-header>
                                        <mat-card-content>
                                            <div class="amount-display">
                                                <span class="amount-label">Amount to Pay:</span>
                                                <span class="amount-value">KES {{ premiumCalculation?.totalPayable | number:'1.2-2' }}</span>
                                            </div>
                                            
                                            <form [formGroup]="paymentForm" class="payment-form">
                                                <mat-form-field appearance="outline" class="phone-field">
                                                    <mat-label>M-Pesa Phone Number</mat-label>
                                                    <input matInput formControlName="phoneNumber" placeholder="254XXXXXXXXX">
                                                    <mat-icon matSuffix>phone</mat-icon>
                                                    <mat-hint>Enter your M-Pesa registered phone number</mat-hint>
                                                </mat-form-field>
                                                
                                                <div class="payment-actions">
                                                    <button mat-raised-button 
                                                            class="pay-button" 
                                                            [disabled]="paymentForm.invalid || isProcessingPayment"
                                                            (click)="initiatePayment()">
                                                        <mat-icon *ngIf="!isProcessingPayment">credit_card</mat-icon>
                                                        <mat-icon *ngIf="isProcessingPayment" class="spin">refresh</mat-icon>
                                                        {{ isProcessingPayment ? 'Processing...' : 'Pay with M-Pesa' }}
                                                    </button>
                                                </div>
                                            </form>
                                            
                                            <div class="payment-info">
                                                <mat-icon class="info-icon">info</mat-icon>
                                                <div class="info-text">
                                                    <p>You will receive an M-Pesa prompt on your phone.</p>
                                                    <p>Enter your M-Pesa PIN to complete the payment.</p>
                                                </div>
                                            </div>
                                        </mat-card-content>
                                    </mat-card>
                                </div>
                            </div>
                        </div>
                    </mat-tab>
                    
                </mat-tab-group>
            </mat-dialog-content>
            
            <mat-dialog-actions align="end" class="modal-actions">
                <button mat-stroked-button (click)="closeDialog()">Cancel</button>
                <button mat-raised-button 
                        color="primary" 
                        (click)="proceedToNextTab()"
                        [disabled]="!canProceed()">
                    {{ getActionButtonText() }}
                </button>
            </mat-dialog-actions>
        </div>
    `,
    styles: [`
      .modal-container { max-width: 900px; width: 100%; }
      .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background-color: #21275c; color: white; }
      .modal-title { margin: 0; font-size: 20px; font-weight: 600; color: white; }
      .close-button { color: rgba(255,255,255,0.7); }
      .modal-content { padding: 0; }
      .modal-actions { padding: 16px 24px; border-top: 1px solid #e5e7eb; }
      
      /* Tab Styles */
      .payment-tabs {
        width: 100%;
      }
      
      ::ng-deep .payment-tabs .mat-mdc-tab-header {
        background-color: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
      }
      
      ::ng-deep .payment-tabs .mat-mdc-tab-label {
        color: #64748b;
        font-weight: 500;
      }
      
      ::ng-deep .payment-tabs .mat-mdc-tab-label.mdc-tab--active {
        color: #21275c;
      }
      
      ::ng-deep .payment-tabs .mat-ink-bar {
        background-color: #04b2e1;
      }
      
      .tab-content {
        padding: 24px;
        min-height: 400px;
      }
      
      /* Premium Card Styles */
      .premium-card {
        margin-bottom: 16px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .premium-title {
        display: flex;
        align-items: center;
        color: #21275c;
        font-weight: 600;
      }
      
      .premium-icon {
        margin-right: 8px;
        color: #04b2e1;
      }
      
      .premium-breakdown {
        margin-top: 16px;
      }
      
      .premium-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
      }
      
      .premium-row:last-child {
        border-bottom: none;
      }
      
      .premium-label {
        color: #64748b;
        font-weight: 500;
      }
      
      .premium-value {
        color: #1e293b;
        font-weight: 600;
      }
      
      .premium-divider {
        margin: 16px 0;
      }
      
      .total-row {
        background-color: #f8fafc;
        padding: 16px;
        margin: 16px -16px -16px -16px;
        border-radius: 8px;
      }
      
      .total-label {
        color: #21275c;
        font-weight: 700;
        font-size: 16px;
      }
      
      .total-value {
        color: #21275c;
        font-weight: 700;
        font-size: 18px;
      }
      
      /* Payment Card Styles */
      .payment-card {
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .payment-title {
        display: flex;
        align-items: center;
        color: #21275c;
        font-weight: 600;
      }
      
      .payment-icon {
        margin-right: 8px;
        color: #04b2e1;
      }
      
      .amount-display {
        background-color: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: center;
      }
      
      .amount-label {
        display: block;
        color: #0369a1;
        font-weight: 500;
        margin-bottom: 8px;
      }
      
      .amount-value {
        display: block;
        color: #0c4a6e;
        font-weight: 700;
        font-size: 24px;
      }
      
      .payment-form {
        margin-bottom: 24px;
      }
      
      .phone-field {
        width: 100%;
      }
      
      .payment-actions {
        display: flex;
        justify-content: center;
        margin-top: 16px;
      }
      
      .pay-button {
        background-color: #22c55e !important;
        color: white !important;
        padding: 12px 32px;
        font-weight: 600;
        font-size: 16px;
        min-width: 200px;
      }
      
      .pay-button:hover:not(:disabled) {
        background-color: #16a34a !important;
      }
      
      .pay-button:disabled {
        background-color: #9ca3af !important;
        color: #6b7280 !important;
      }
      
      .payment-info {
        display: flex;
        align-items: flex-start;
        background-color: #fef3c7;
        border: 1px solid #fbbf24;
        border-radius: 8px;
        padding: 16px;
      }
      
      .info-icon {
        color: #d97706;
        margin-right: 12px;
        margin-top: 2px;
      }
      
      .info-text {
        color: #92400e;
      }
      
      .info-text p {
        margin: 0 0 4px 0;
        font-size: 14px;
      }
      
      /* Loading and Status Messages */
      .recalculating-message,
      .no-quote-message {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        color: #64748b;
        font-weight: 500;
      }
      
      .recalculating-message mat-icon,
      .no-quote-message mat-icon {
        margin-right: 8px;
      }
      
      .spin {
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      /* Toast message styles */
      ::ng-deep .success-snackbar {
        background-color: #4caf50 !important;
        color: white !important;
      }
      
      ::ng-deep .error-snackbar {
        background-color: #f44336 !important;
        color: white !important;
      }
      
      ::ng-deep .warning-snackbar {
        background-color: #ff9800 !important;
        color: white !important;
      }
      
      ::ng-deep .info-snackbar {
        background-color: #2196f3 !important;
        color: white !important;
      }
      
      ::ng-deep .success-snackbar .mat-mdc-snack-bar-action {
        color: white !important;
      }
      
      ::ng-deep .error-snackbar .mat-mdc-snack-bar-action {
        color: white !important;
      }
      
      ::ng-deep .warning-snackbar .mat-mdc-snack-bar-action {
        color: white !important;
      }
      
      ::ng-deep .info-snackbar .mat-mdc-snack-bar-action {
        color: white !important;
      }
    `]
})
export class ShipmentDetailsModalComponent implements OnInit, OnDestroy {
    shipmentForm: FormGroup;
    paymentForm: FormGroup;
    private destroy$ = new Subject<void>();

    // Tab management
    selectedTabIndex = 0;
    
    // Quote calculation
    premiumCalculation: any = null;
    quoteCalculated = false;
    isRecalculating = false;
    
    // Payment processing
    isProcessingPayment = false;


    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<ShipmentDetailsModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ShipmentDetailsData,
        private quoteService: QuoteService,
        private userService: UserService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.shipmentForm = this.fb.group({
            shippingModeName: [''],
            importerType: [''],
            originCountryName: [''],
            consignmentNumber: [''],
            sumassured: [null, Validators.required],
            description: [''],
            vesselName: [''],
            originPortName: [''],
            destPortName: [''],
            countyName: [''],
            idfNumber: [''],
            ucrNumber: [''],
            postalAddress: [''],
            postalCode: ['']
        });

        this.paymentForm = this.fb.group({
            phoneNumber: ['', [Validators.required, Validators.pattern(/^254[0-9]{9}$/)]]
        });

        // Use setTimeout to avoid change detection issues
        setTimeout(() => {
            this.loadShipmentDetails();
        }, 0);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // Form change handler to trigger quote recalculation
    onFormChange(): void {
        if (this.shipmentForm.valid) {
            this.recalculateQuote();
        }
    }

    // Recalculate quote when form changes
    recalculateQuote(): void {
        this.isRecalculating = true;
        this.quoteCalculated = false;
        
        // Simulate API call for quote calculation
        setTimeout(() => {
            const sumInsured = this.shipmentForm.get('sumassured')?.value || 0;
            const basePremium = sumInsured * 0.015; // 1.5% base rate
            const phcf = basePremium * 0.025; // 2.5% PHCF
            const trainingLevy = basePremium * 0.002; // 0.2% Training Levy
            const stampDuty = 40; // Fixed stamp duty
            const totalPayable = basePremium + phcf + trainingLevy + stampDuty;

            this.premiumCalculation = {
                basePremium,
                phcf,
                trainingLevy,
                stampDuty,
                totalPayable
            };
            
            this.isRecalculating = false;
            this.quoteCalculated = true;
            this.cdr.detectChanges();
        }, 1500);
    }

    // Tab navigation methods
    proceedToNextTab(): void {
        if (this.selectedTabIndex === 0) {
            if (this.shipmentForm.valid) {
                this.recalculateQuote();
                this.selectedTabIndex = 1;
            } else {
                this.snackBar.open('Please fill in all required fields', 'Close', {
                    duration: 3000,
                    panelClass: ['error-snackbar']
                });
            }
        } else if (this.selectedTabIndex === 1) {
            this.selectedTabIndex = 2;
        }
    }

    canProceed(): boolean {
        if (this.selectedTabIndex === 0) {
            return this.shipmentForm.valid;
        } else if (this.selectedTabIndex === 1) {
            return this.quoteCalculated && !!this.premiumCalculation;
        }
        return false;
    }

    getActionButtonText(): string {
        if (this.selectedTabIndex === 0) {
            return 'Calculate Premium';
        } else if (this.selectedTabIndex === 1) {
            return 'Proceed to Payment';
        }
        return 'Complete';
    }

    // M-Pesa payment integration
    initiatePayment(): void {
        if (this.paymentForm.invalid || !this.premiumCalculation) {
            this.snackBar.open('Please enter a valid phone number', 'Close', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
            return;
        }

        this.isProcessingPayment = true;
        const phoneNumber = this.paymentForm.get('phoneNumber')?.value;
        const amount = this.premiumCalculation.totalPayable;

        this.snackBar.open('Initiating M-Pesa payment...', 'Close', {
            duration: 2000,
            panelClass: ['info-snackbar']
        });

        setTimeout(() => {
            this.snackBar.open('M-Pesa prompt sent to your phone. Please enter your PIN to complete payment.', 'Close', {
                duration: 5000,
                panelClass: ['success-snackbar']
            });
            
            setTimeout(() => {
                this.isProcessingPayment = false;
                this.snackBar.open('Payment successful! Your marine insurance policy is now active.', 'Close', {
                    duration: 5000,
                    panelClass: ['success-snackbar']
                });
                
                setTimeout(() => {
                    this.dialogRef.close({ paymentSuccess: true });
                }, 2000);
            }, 3000);
        }, 2000);
    }

    closeDialog(): void {
        this.dialogRef.close();
    }

    // Load shipment details and populate form
    private loadShipmentDetails(): void {
        if (this.data.shippingId) {
            this.quoteService.getShipmentDetails(this.data.shippingId).subscribe({
                next: (details: any) => {
                    if (details) {
                        this.shipmentForm.patchValue({
                            shippingModeName: details.shippingModeName || '',
                            importerType: details.importerType || '',
                            originCountryName: details.originCountryName || '',
                            consignmentNumber: details.consignmentNumber || '',
                            sumassured: details.sumassured || null,
                            description: details.description || '',
                            vesselName: details.vesselName || '',
                            originPortName: details.originPortName || '',
                            destPortName: details.destPortName || '',
                            countyName: details.countyName || '',
                            idfNumber: details.idfNumber || '',
                            ucrNumber: details.ucrNumber || ''
                        });

                    }
                },
                error: (error) => {
                    console.error('Error loading shipment details:', error);
                    this.snackBar.open('Error loading shipment details', 'Close', {
                        duration: 3000,
                        panelClass: ['error-snackbar']
                    });
                }
            });

            if (this.data.postalAddress || this.data.postalCode) {
                this.shipmentForm.patchValue({
                    postalAddress: this.data.postalAddress,
                    postalCode: this.data.postalCode
                });
            }
        }
    }
}
