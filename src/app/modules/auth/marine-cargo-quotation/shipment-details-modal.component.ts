import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
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
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
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
        PaymentModalComponent
    ],
    template: `
        <div class="modal-container">
            <div class="modal-header">
                <h2 mat-dialog-title class="modal-title">Review Shipment Details</h2>
                <button mat-icon-button (click)="closeDialog()" class="close-button" aria-label="Close dialog">
                    <mat-icon>close</mat-icon>
                </button>
            </div>
            <mat-dialog-content class="modal-content">
                <form [formGroup]="shipmentForm" class="p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                        <mat-form-field appearance="outline">
                            <mat-label>Mode of Shipment</mat-label>
                            <input matInput formControlName="shippingModeName">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Trade Type</mat-label>
                            <input matInput formControlName="importerType">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Country of Origin</mat-label>
                            <input matInput formControlName="originCountryName">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Insured Name</mat-label>
                            <input matInput formControlName="consignmentNumber">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Sum Insured</mat-label>
                            <input matInput formControlName="sumassured" type="number">
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="md:col-span-2">
                            <mat-label>Goods Description</mat-label>
                            <textarea matInput formControlName="description" rows="3"></textarea>
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Vessel Name</mat-label>
                            <input matInput formControlName="vesselName">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Loading Port</mat-label>
                            <input matInput formControlName="originPortName">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Port of Discharge</mat-label>
                            <input matInput formControlName="destPortName">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Final Destination (County)</mat-label>
                            <input matInput formControlName="countyName">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>IDF Number</mat-label>
                            <input matInput formControlName="idfNumber">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>UCR Number</mat-label>
                            <input matInput formControlName="ucrNumber">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Postal Address</mat-label>
                            <input matInput formControlName="postalAddress">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Postal Code</mat-label>
                            <input matInput formControlName="postalCode">
                        </mat-form-field>

                    </div>
                </form>
            </mat-dialog-content>
            <mat-dialog-actions align="end" class="modal-actions">
                <button mat-stroked-button (click)="closeDialog()">Cancel</button>
                <button mat-raised-button color="primary" (click)="saveAndContinue()">
                    Continue to Payment
                </button>
            </mat-dialog-actions>
        </div>
    `,
    styles: [`
      .modal-container { max-width: 800px; width: 100%; }
      .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background-color: #21275c; color: white; }
      .modal-title { margin: 0; font-size: 20px; font-weight: 600; color: white; }
      .close-button { color: rgba(255,255,255,0.7); }
      .modal-content { padding: 16px; }
      .modal-actions { padding: 16px 24px; border-top: 1px solid #e5e7eb; }
      
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
export class ShipmentDetailsModalComponent implements OnInit {
    shipmentForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<ShipmentDetailsModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ShipmentDetailsData,
        private quoteService: QuoteService,
        private userService: UserService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
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

        this.loadShipmentDetails();
    }

    loadShipmentDetails(): void {
        console.log('Loading shipment details for ID:', this.data.shippingId);
        
        this.quoteService.getShipmentDetails(this.data.shippingId).subscribe({
            next: (details) => {
                console.log('Shipment details loaded:', details);
                
                this.shipmentForm.patchValue({
                    shippingModeName: details.shippingModeName || '',
                    importerType: details.importerType || '',
                    originCountryName: details.originCountryName || '',
                    consignmentNumber: details.consignmentNumber || '',
                    sumassured: details.sumassured || 0,
                    description: details.description || '',
                    vesselName: details.vesselName || '',
                    originPortName: details.originPortName || '',
                    destPortName: details.destPortName || '',
                    countyName: details.countyName || '',
                    idfNumber: details.idfNumber || '',
                    ucrNumber: details.ucrNumber || '',
                    // Use KYC data if available, otherwise leave empty (API doesn't provide postal data)
                    postalAddress: this.data.postalAddress || '',
                    postalCode: this.data.postalCode || ''
                });
            },
            error: (err) => {
                console.error('Error fetching shipment details', err);
                // If API fails but we have KYC data, still populate postal fields
                if (this.data.postalAddress || this.data.postalCode) {
                    this.shipmentForm.patchValue({
                        postalAddress: this.data.postalAddress,
                        postalCode: this.data.postalCode
                    });
                }
            }
        });
    }

    saveAndContinue(): void {
        if (this.shipmentForm.invalid) {
            this.snackBar.open('Please fill in all required fields', 'Close', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
            return;
        }
        
        // Since the API only supports GET (read-only), show informational message and proceed to payment
        console.log('Shipment details reviewed for ID:', this.data.shippingId);
        console.log('Form data (for reference only):', this.shipmentForm.value);
        
        this.snackBar.open('Shipment details reviewed. Proceeding to payment...', 'Close', {
            duration: 2000,
            panelClass: ['info-snackbar']
        });
        
        // Proceed to payment after brief delay
        setTimeout(() => {
            this.dialogRef.close();
            this.openPaymentModal(this.data.shippingId);
        }, 1500);
    }

    private openPaymentModal(shippingId: number): void {
        this.userService.getShippingData(shippingId).subscribe(data => {
            const isMobile = window.innerWidth < 480;
            const dialogRef = this.dialog.open(PaymentModalComponent, {
                width: isMobile ? '95vw' : '450px',
                maxWidth: '95vw',
                data: {
                    amount: data.netpremium,
                    phoneNumber: data.phoneNo,
                    reference: data.refno,
                    description: `Marine Cargo Insurance for Quote ${data.refno}`,
                },
                disableClose: true,
            });

            dialogRef.afterClosed().subscribe((paymentResult) => {
                if (paymentResult?.success) {
                    console.log('Payment successful!');
                    // Optionally navigate to dashboard or show success message
                } else {
                    console.log('Payment cancelled or failed');
                    // Optionally show error message or allow retry
                }
            });
        });
    }

    closeDialog(): void {
        this.dialogRef.close();
    }
}
