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
        MatSelectModule,
        NgxMatSelectSearchModule,
        ScrollingModule,
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
                            <mat-select formControlName="originCountryId">
                                <mat-option>
                                    <ngx-mat-select-search [formControl]="countryFilterCtrl" placeholderLabel="Search countries..."></ngx-mat-select-search>
                                </mat-option>
                                <cdk-virtual-scroll-viewport itemSize="50" class="h-[200px]">
                                    <mat-option *cdkVirtualFor="let country of filteredCountries" [value]="country.id">
                                        {{ country.countryname }}
                                    </mat-option>
                                </cdk-virtual-scroll-viewport>
                            </mat-select>
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
                            <mat-select formControlName="originPortId">
                                <mat-option>
                                    <ngx-mat-select-search [formControl]="loadingPortFilterCtrl" placeholderLabel="Search ports..."></ngx-mat-select-search>
                                </mat-option>
                                <cdk-virtual-scroll-viewport itemSize="50" class="h-[200px]">
                                    <mat-option *cdkVirtualFor="let port of filteredLoadingPorts" [value]="port.id">
                                        {{ port.portName }}
                                    </mat-option>
                                </cdk-virtual-scroll-viewport>
                            </mat-select>
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Port of Discharge</mat-label>
                            <mat-select formControlName="destPortId">
                                <mat-option>
                                    <ngx-mat-select-search [formControl]="dischargePortFilterCtrl" placeholderLabel="Search ports..."></ngx-mat-select-search>
                                </mat-option>
                                <cdk-virtual-scroll-viewport itemSize="50" class="h-[200px]">
                                    <mat-option *cdkVirtualFor="let port of filteredDischargePorts" [value]="port.id">
                                        {{ port.portName }}
                                    </mat-option>
                                </cdk-virtual-scroll-viewport>
                            </mat-select>
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                            <mat-label>Final Destination (County)</mat-label>
                            <mat-select formControlName="countyId">
                                <mat-option>
                                    <ngx-mat-select-search [formControl]="countyFilterCtrl" placeholderLabel="Search counties..."></ngx-mat-select-search>
                                </mat-option>
                                <mat-option *ngFor="let county of filteredCounties" [value]="county.id">
                                    {{ county.portName }}
                                </mat-option>
                            </mat-select>
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
export class ShipmentDetailsModalComponent implements OnInit, OnDestroy {
    shipmentForm: FormGroup;
    private destroy$ = new Subject<void>();

    // Filter controls for searchable dropdowns
    countryFilterCtrl: FormControl = new FormControl();
    loadingPortFilterCtrl: FormControl = new FormControl();
    dischargePortFilterCtrl: FormControl = new FormControl();
    countyFilterCtrl: FormControl = new FormControl();

    // Data arrays for dropdowns
    filteredCountries: any[] = [];
    filteredLoadingPorts: any[] = [];
    filteredDischargePorts: any[] = [];
    filteredCounties: any[] = [];

    // Pagination state
    countriesPage = 0;
    loadingPortsPage = 0;
    dischargePortsPage = 0;
    
    // Loading states
    countriesLoading = false;
    loadingPortsLoading = false;
    dischargePortsLoading = false;

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
            originCountryId: [''],
            originCountryName: [''], // Keep for display
            consignmentNumber: [''],
            sumassured: [null, Validators.required],
            description: [''],
            vesselName: [''],
            originPortId: [''],
            originPortName: [''], // Keep for display
            destPortId: [''],
            destPortName: [''], // Keep for display
            countyId: [''],
            countyName: [''], // Keep for display
            idfNumber: [''],
            ucrNumber: [''],
            postalAddress: [''],
            postalCode: ['']
        });

        this.loadShipmentDetails();
        this.setupSearchFilters();
        this.loadInitialData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadShipmentDetails(): void {
        console.log('Loading shipment details for ID:', this.data.shippingId);
        
        this.quoteService.getShipmentDetails(this.data.shippingId).subscribe({
            next: (details) => {
                console.log('Shipment details loaded:', details);
                
                this.shipmentForm.patchValue({
                    shippingModeName: details.shippingModeName || '',
                    importerType: details.importerType || '',
                    originCountryId: details.originCountryId || '',
                    originCountryName: details.originCountryName || '',
                    consignmentNumber: details.consignmentNumber || '',
                    sumassured: details.sumassured || 0,
                    description: details.description || '',
                    vesselName: details.vesselName || '',
                    originPortId: details.loadingAtId || details.originPortId || '',
                    originPortName: details.originPortName || '',
                    destPortId: details.dischargeId || details.destPortId || '',
                    destPortName: details.destPortName || '',
                    countyId: details.countyId || '',
                    countyName: details.countyName || '',
                    idfNumber: details.idfNumber || '',
                    ucrNumber: details.ucrNumber || '',
                    // Use KYC data if available, otherwise leave empty (API doesn't provide postal data)
                    postalAddress: this.data.postalAddress || '',
                    postalCode: this.data.postalCode || ''
                });
                
                // Ensure the dropdowns show the correct selected values
                this.ensureDropdownSelections(details);
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

    private setupSearchFilters(): void {
        // Country search with debounce
        this.countryFilterCtrl.valueChanges.pipe(
            debounceTime(300),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.filteredCountries = [];
            this.countriesPage = 0;
            this.loadNextCountriesPage();
        });

        // Loading port search with debounce
        this.loadingPortFilterCtrl.valueChanges.pipe(
            debounceTime(300),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.filteredLoadingPorts = [];
            this.loadingPortsPage = 0;
            this.loadNextLoadingPortsPage();
        });

        // Discharge port search with debounce
        this.dischargePortFilterCtrl.valueChanges.pipe(
            debounceTime(300),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.filteredDischargePorts = [];
            this.dischargePortsPage = 0;
            this.loadNextDischargePortsPage();
        });

        // County search (local filtering)
        this.countyFilterCtrl.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.filterCounties();
        });
    }

    private loadInitialData(): void {
        this.loadNextCountriesPage();
        this.loadNextLoadingPortsPage();
        this.loadNextDischargePortsPage();
        this.loadCounties();
    }

    loadNextCountriesPage(): void {
        if (this.countriesLoading) return;
        this.countriesLoading = true;
        
        this.userService.getCountries(this.countriesPage, 20, 1) // type 1 for countries
            .subscribe({
                next: (res) => {
                    const searchTerm = this.countryFilterCtrl.value?.toLowerCase() || '';
                    const newCountries = searchTerm 
                        ? res.pageItems.filter((country: any) => 
                            country.countryname.toLowerCase().includes(searchTerm))
                        : res.pageItems;
                    
                    this.filteredCountries = [...this.filteredCountries, ...newCountries];
                    this.countriesPage++;
                    this.countriesLoading = false;
                },
                error: () => {
                    this.countriesLoading = false;
                }
            });
    }

    loadNextLoadingPortsPage(): void {
        if (this.loadingPortsLoading) return;
        this.loadingPortsLoading = true;
        
        // Get country and shipping mode from form or use defaults
        const countryId = this.shipmentForm.get('originCountryId')?.value || 7; // Default to Armenia
        const shippingModeType = "1"; // Sea shipping mode as string
        
        this.userService.getPorts(countryId, shippingModeType, this.loadingPortsPage, 20, this.loadingPortFilterCtrl.value)
            .subscribe({
                next: (res) => {
                    this.filteredLoadingPorts = [...this.filteredLoadingPorts, ...res.pageItems];
                    this.loadingPortsPage++;
                    this.loadingPortsLoading = false;
                },
                error: () => {
                    this.loadingPortsLoading = false;
                }
            });
    }

    loadNextDischargePortsPage(): void {
        if (this.dischargePortsLoading) return;
        this.dischargePortsLoading = true;
        
        const countryId = 116; // Kenya
        const shippingModeType = "1"; // Sea shipping mode as string
        
        this.userService.getPorts(countryId, shippingModeType, this.dischargePortsPage, 20, this.dischargePortFilterCtrl.value)
            .subscribe({
                next: (res) => {
                    this.filteredDischargePorts = [...this.filteredDischargePorts, ...res.pageItems];
                    this.dischargePortsPage++;
                    this.dischargePortsLoading = false;
                },
                error: () => {
                    this.dischargePortsLoading = false;
                }
            });
    }

    private loadCounties(): void {
        this.userService.getCounties(0, 100).subscribe({
            next: (res) => {
                this.filteredCounties = res.pageItems || [];
            },
            error: (err) => {
                console.error('Error loading counties:', err);
            }
        });
    }

    private filterCounties(): void {
        if (!this.filteredCounties) {
            return;
        }
        let search = this.countyFilterCtrl.value;
        if (!search) {
            return;
        }
        search = search.toLowerCase();
        this.filteredCounties = this.filteredCounties.filter(county => 
            county.portName.toLowerCase().includes(search)
        );
    }

    private ensureDropdownSelections(details: any): void {
        // Ensure the selected country is in the filtered list
        if (details.originCountryId && details.originCountryName) {
            const countryExists = this.filteredCountries.find(c => c.id === details.originCountryId);
            if (!countryExists) {
                this.filteredCountries.unshift({
                    id: details.originCountryId,
                    countryname: details.originCountryName
                });
            }
        }

        // Ensure the selected loading port is in the filtered list
        if (details.loadingAtId && details.originPortName) {
            const portExists = this.filteredLoadingPorts.find(p => p.id === details.loadingAtId);
            if (!portExists) {
                this.filteredLoadingPorts.unshift({
                    id: details.loadingAtId,
                    portName: details.originPortName
                });
            }
        }

        // Ensure the selected discharge port is in the filtered list
        if (details.dischargeId && details.destPortName) {
            const portExists = this.filteredDischargePorts.find(p => p.id === details.dischargeId);
            if (!portExists) {
                this.filteredDischargePorts.unshift({
                    id: details.dischargeId,
                    portName: details.destPortName
                });
            }
        }

        // Ensure the selected county is in the filtered list
        if (details.countyId && details.countyName) {
            const countyExists = this.filteredCounties.find(c => c.id === details.countyId);
            if (!countyExists) {
                this.filteredCounties.unshift({
                    id: details.countyId,
                    portName: details.countyName
                });
            }
        }
    }

    closeDialog(): void {
        this.dialogRef.close();
    }
}
