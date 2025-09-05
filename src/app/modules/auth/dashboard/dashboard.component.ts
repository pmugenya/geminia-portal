import { CommonModule } from '@angular/common';
import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AuthenticationService, PendingQuote, StoredUser } from '../shared/services/auth.service';
import { UserService } from '../../../core/user/user.service';



// --- TYPE DEFINITIONS ---
interface Policy {
  id: string; type: 'marine' | 'travel'; title: string; policyNumber: string; status: 'active' | 'completed'; premium: number; startDate: Date; endDate: Date; certificateUrl?: string; hasClaim?: boolean;
  marineDetails?: { vesselName: string; cargoType: string; tradeType: string; modeOfShipment: string; marineProduct: string; marineCargoType: string; origin: string; destination: string; sumInsured: number; descriptionOfGoods: string; ucrNumber: string; idfNumber: string; clientInfo: { name: string; idNumber: string; kraPin: string; email: string; phoneNumber: string; } }
}
type ClaimStatus = 'Submitted' | 'Under Review' | 'More Information Required' | 'Approved' | 'Settled' | 'Rejected';
interface ClaimDocument { name: string; size: number; type: string; }
interface Claim {
  id: string; policyId: string; policyNumber: string; claimNumber: string; dateOfLoss: Date; typeOfLoss: string; description: string; estimatedLoss: number; status: ClaimStatus; submittedDate: Date; documents: ClaimDocument[];
}

interface DashboardStats { marinePolicies: number; travelPolicies: number; pendingQuotes: number; totalPremium: number; activeClaims: number; }
interface MpesaPayment { amount: number; phoneNumber: string; reference: string; description: string; }
interface NavigationItem { label: string; icon: string; route?: string;sectionId?: string; children?: NavigationItem[]; badge?: number; isExpanded?: boolean; }
interface Notification { id: string; title: string; message: string; timestamp: Date; read: boolean; actionUrl?: string; }
interface Activity { id: string; title: string; description: string; timestamp: Date; icon: string; iconColor: string; amount?: number; relatedId?: string; }
export interface PaymentResult { success: boolean; method: 'stk' | 'paybill' | 'card'; reference: string; mpesaReceipt?: string; }

// --- EMBEDDED PAYMENT MODAL COMPONENT ---
@Component({
  selector: 'app-mpesa-payment-modal',
  standalone: true,
  imports: [ CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatProgressSpinnerModule, MatTabsModule ],
  template: `<div class="payment-modal-container"><div class="modal-header"><div class="header-icon-wrapper"><mat-icon>payment</mat-icon></div><div><h1 mat-dialog-title class="modal-title">Complete Your Payment</h1><p class="modal-subtitle">Pay KES {{ data.amount | number: '1.2-2' }} for {{ data.description }}</p></div><button mat-icon-button (click)="closeDialog()" class="close-button" aria-label="Close dialog"><mat-icon>close</mat-icon></button></div><mat-dialog-content class="modal-content"><mat-tab-group (selectedTabChange)="selectedPaymentMethod = $event.index === 0 ? 'mpesa' : 'card'" animationDuration="300ms" mat-stretch-tabs="true" class="payment-tabs"><mat-tab><ng-template mat-tab-label><div class="tab-label-content"><mat-icon>phone_iphone</mat-icon><span>M-PESA</span></div></ng-template><div class="tab-panel-content"><div class="sub-options"><button (click)="mpesaSubMethod = 'stk'" class="sub-option-btn" [class.active]="mpesaSubMethod === 'stk'"><mat-icon>tap_and_play</mat-icon><span>STK Push</span></button><button (click)="mpesaSubMethod = 'paybill'" class="sub-option-btn" [class.active]="mpesaSubMethod === 'paybill'"><mat-icon>article</mat-icon><span>Use Paybill</span></button></div><div *ngIf="mpesaSubMethod === 'stk'" class="option-view animate-fade-in"><p class="instruction-text">Enter your M-PESA phone number to receive a payment prompt.</p><form [formGroup]="stkForm"><mat-form-field appearance="outline"><mat-label>Phone Number</mat-label><input matInput formControlName="phoneNumber" placeholder="e.g., 0712345678" [disabled]="isProcessingStk"><mat-icon matSuffix>phone_iphone</mat-icon></mat-form-field></form><button class="btn-primary w-full" (click)="processStkPush()" [disabled]="stkForm.invalid || isProcessingStk"><mat-spinner *ngIf="isProcessingStk" diameter="24"></mat-spinner><span *ngIf="!isProcessingStk">Pay KES {{ data.amount | number: '1.0-0' }}</span></button></div><div *ngIf="mpesaSubMethod === 'paybill'" class="option-view animate-fade-in"><p class="instruction-text">Use the details below on your M-PESA App to complete payment.</p><div class="paybill-details"><div class="detail-item"><span class="label">Paybill Number:</span><span class="value">853338</span></div><div class="detail-item"><span class="label">Account Number:</span><span class="value account-number">{{ data.reference }}</span></div></div><button class="btn-primary w-full" (click)="verifyPaybillPayment()" [disabled]="isVerifyingPaybill"><mat-spinner *ngIf="isVerifyingPaybill" diameter="24"></mat-spinner><span *ngIf="!isVerifyingPaybill">Verify Payment</span></button></div></div></mat-tab><mat-tab><ng-template mat-tab-label><div class="tab-label-content"><mat-icon>credit_card</mat-icon><span>Credit/Debit Card</span></div></ng-template><div class="tab-panel-content animate-fade-in"><div class="card-redirect-info"><p class="instruction-text">You will be redirected to pay via <strong>I&M Bank</strong>, our reliable and trusted payment partner.</p><button class="btn-primary w-full" (click)="redirectToCardGateway()" [disabled]="isRedirectingToCard"><mat-spinner *ngIf="isRedirectingToCard" diameter="24"></mat-spinner><span *ngIf="!isRedirectingToCard">Pay Using Credit/Debit Card</span></button></div></div></mat-tab></mat-tab-group></mat-dialog-content></div>`,
  styles: [`
    :host { --pantone-306c: #04b2e1; --pantone-2758c: #21275c; --white-color: #ffffff; --light-gray: #f8f9fa; --medium-gray: #e9ecef; --dark-gray: #495057; }
    .payment-modal-container { background-color: var(--white-color); border-radius: 16px; overflow: hidden; max-width: 450px; }
    .modal-header { display: flex; align-items: center; padding: 20px 24px; background-color: var(--pantone-2758c); color: var(--white-color); position: relative; }
    .header-icon-wrapper { width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0; }
    .header-icon-wrapper mat-icon { color: var(--pantone-306c); font-size: 28px; width: 28px; height: 28px; }
    .modal-title { font-size: 22px; font-weight: 700; margin: 0; color: var(--white-color); text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
    .modal-subtitle { font-size: 14px; opacity: 0.8; margin-top: 4px; color: var(--white-color); }
    .close-button { position: absolute; top: 12px; right: 12px; color: var(--white-color); }
    .modal-content { padding: 0 !important; }
    .payment-tabs .tab-label-content { display: flex; align-items: center; gap: 8px; height: 60px; }
    .tab-panel-content { padding: 24px; }
    .sub-options { display: flex; gap: 12px; margin-bottom: 24px; border: 1px solid var(--medium-gray); border-radius: 12px; padding: 6px; background-color: var(--light-gray); }
    .sub-option-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 8px; border: none; background-color: transparent; font-weight: 600; cursor: pointer; transition: all 0.2s; color: var(--dark-gray); }
    .sub-option-btn.active { background-color: var(--white-color); color: var(--pantone-306c); }
    .instruction-text { text-align: center; color: var(--dark-gray); font-size: 15px; margin-bottom: 20px; }
    mat-form-field { width: 100%; }
    .paybill-details { background: var(--light-gray); border: 1px dashed var(--medium-gray); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .detail-item { display: flex; justify-content: space-between; align-items: center; font-size: 16px; padding: 12px 0; }
    .detail-item + .detail-item { border-top: 1px solid var(--medium-gray); }
    .detail-item .label { color: var(--dark-gray); }
    .detail-item .value { font-weight: 700; }
    .detail-item .account-number { font-family: 'Courier New', monospace; background-color: var(--medium-gray); padding: 4px 8px; border-radius: 6px; }
    .card-redirect-info { text-align: center; }
    .animate-fade-in { animation: fadeIn 0.4s ease-in-out; }@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
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
        height: 52px;
        font-size: 16px;
    }
    .btn-primary:hover:not(:disabled) {
        background-color: #21275c;
    }
    .btn-primary:disabled {
        background-color: #9ca3af;
        cursor: not-allowed;
        opacity: 0.7;
    }
    ::ng-deep .payment-tabs .mat-mdc-tab-header { --mat-tab-header-inactive-ripple-color: rgba(4, 178, 225, 0.1); --mat-tab-header-active-ripple-color: rgba(4, 178, 225, 0.2); }
    ::ng-deep .payment-tabs .mdc-tab__text-label { color: var(--dark-gray); font-weight: 600; }
    ::ng-deep .payment-tabs .mat-mdc-tab.mat-mdc-tab-active .mdc-tab__text-label { color: var(--pantone-306c); }
    ::ng-deep .payment-tabs .mat-mdc-tab-indicator-bar { background-color: var(--pantone-306c) !important; }
  `]
})
export class MpesaPaymentModalComponent implements OnInit { stkForm: FormGroup; selectedPaymentMethod: 'mpesa' | 'card' = 'mpesa'; mpesaSubMethod: 'stk' | 'paybill' = 'stk'; isProcessingStk = false; isVerifyingPaybill = false; isRedirectingToCard = false; constructor(private fb: FormBuilder, public dialogRef: MatDialogRef<MpesaPaymentModalComponent>, @Inject(MAT_DIALOG_DATA) public data: MpesaPayment) { this.stkForm = this.fb.group({ phoneNumber: [data.phoneNumber || '', [Validators.required, Validators.pattern(/^(07|01)\d{8}$/)]], }); } ngOnInit(): void {} closeDialog(result: PaymentResult | null = null): void { this.dialogRef.close(result); } processStkPush(): void { if (this.stkForm.invalid) return; this.isProcessingStk = true; setTimeout(() => { this.isProcessingStk = false; this.closeDialog({ success: true, method: 'stk', reference: this.data.reference, mpesaReceipt: 'S' + Math.random().toString(36).substring(2, 12).toUpperCase() }); }, 3000); } verifyPaybillPayment(): void { this.isVerifyingPaybill = true; setTimeout(() => { this.isVerifyingPaybill = false; this.closeDialog({ success: true, method: 'paybill', reference: this.data.reference }); }, 3500); } redirectToCardGateway(): void { this.isRedirectingToCard = true; setTimeout(() => { this.isRedirectingToCard = false; console.log('Redirecting to I&M Bank payment gateway...'); this.closeDialog({ success: true, method: 'card', reference: this.data.reference }); }, 2000); } }


// --- NEW CLAIM REGISTRATION MODAL COMPONENT ---
@Component({
  selector: 'app-claim-registration-modal',
  standalone: true,
  imports: [ CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatProgressSpinnerModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatDividerModule ],
  template: `
    <div class="claim-modal-container">
      <div class="modal-header">
        <div class="header-icon-wrapper"><mat-icon>assignment_late</mat-icon></div>
        <div>
          <h1 mat-dialog-title class="modal-title">Register a New Claim</h1>
          <p class="modal-subtitle">For Policy: {{ data.policy.policyNumber }}</p>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-button" aria-label="Close dialog"><mat-icon>close</mat-icon></button>
      </div>
      <mat-dialog-content class="modal-content">
        <form [formGroup]="claimForm" (ngSubmit)="submitClaim()">
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Date of Loss / Incident</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="dateOfLoss" readonly>
              <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type of Loss</mat-label>
              <mat-select formControlName="typeOfLoss">
                <mat-option value="Damage">Damage to Goods</mat-option>
                <mat-option value="Theft">Theft or Pilferage</mat-option>
                <mat-option value="Loss">Total Loss of Cargo</mat-option>
                <mat-option value="Other">Other</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Estimated Loss Amount (KES)</mat-label>
            <input matInput type="number" formControlName="estimatedLoss" placeholder="e.g., 50000">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Detailed Description of Incident</mat-label>
            <textarea matInput formControlName="description" rows="4" placeholder="Describe what happened, the items affected, and any other relevant details..."></textarea>
          </mat-form-field>

          <div class="file-upload-section">
            <h4 class="file-upload-title">Supporting Documents</h4>
            <p class="file-upload-subtitle">Upload photos, shipping documents, police reports, etc.</p>
            <button type="button" mat-stroked-button color="primary" (click)="fileInput.click()" class="upload-button">
              <mat-icon>attach_file</mat-icon> Select Files
            </button>
            <input hidden (change)="onFileSelected($event)" #fileInput type="file" multiple>

            <div *ngIf="selectedFiles.length > 0" class="file-list">
              <div *ngFor="let file of selectedFiles; let i = index" class="file-item">
                <mat-icon class="file-icon">description</mat-icon>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">({{ file.size / 1024 | number:'1.0-0' }} KB)</span>
                <button mat-icon-button (click)="removeFile(i)" type="button" class="remove-file-btn" aria-label="Remove file">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button class="btn-primary" (click)="submitClaim()" [disabled]="claimForm.invalid || isSubmitting">
            <mat-spinner *ngIf="isSubmitting" diameter="24"></mat-spinner>
            <span *ngIf="!isSubmitting">Submit Claim</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    :host { --pantone-306c: #04b2e1; --pantone-2758c: #21275c; --white-color: #ffffff; --light-gray: #f8f9fa; --medium-gray: #e9ecef; --dark-gray: #495057; }
    .claim-modal-container { max-width: 650px; }
    .modal-header { display: flex; align-items: center; padding: 20px 24px; background-color: var(--pantone-2758c); color: var(--white-color); position: relative; }
    .header-icon-wrapper { width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0; }
    .header-icon-wrapper mat-icon { color: var(--pantone-306c); font-size: 28px; width: 28px; height: 28px; }
    .modal-title { font-size: 22px; font-weight: 700; margin: 0; color: var(--white-color); }
    .modal-subtitle { font-size: 14px; opacity: 0.8; margin-top: 4px; }
    .close-button { position: absolute; top: 12px; right: 12px; color: var(--white-color); }
    .modal-content { padding: 24px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .full-width { width: 100%; margin-bottom: 16px; }
    .file-upload-section { margin-top: 16px; padding: 16px; border: 1px dashed var(--medium-gray); border-radius: 8px; background-color: var(--light-gray); }
    .file-upload-title { font-weight: 600; color: var(--pantone-2758c); margin: 0 0 4px 0; }
    .file-upload-subtitle { font-size: 13px; color: var(--dark-gray); margin: 0 0 16px 0; }
    .upload-button { width: 100%; }
    .file-list { margin-top: 16px; }
    .file-item { display: flex; align-items: center; padding: 8px; background-color: var(--white-color); border-radius: 6px; margin-bottom: 8px; border: 1px solid var(--medium-gray); }
    .file-icon { color: var(--dark-gray); margin-right: 8px; }
    .file-name { flex-grow: 1; font-size: 14px; color: var(--pantone-2758c); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-size { font-size: 12px; color: var(--dark-gray); margin-left: 8px; }
    .remove-file-btn { margin-left: auto; }
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
  `]
})
export class ClaimRegistrationModalComponent {
  claimForm: FormGroup;
  selectedFiles: File[] = [];
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ClaimRegistrationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { policy: Policy }
  ) {
    this.claimForm = this.fb.group({
      dateOfLoss: ['', Validators.required],
      typeOfLoss: ['', Validators.required],
      estimatedLoss: ['', [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles.push(...Array.from(input.files));
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  submitClaim(): void {
    if (this.claimForm.invalid) {
      return;
    }
    this.isSubmitting = true;
    setTimeout(() => {
      const formValue = this.claimForm.value;
      const newClaim: Claim = {
        id: 'CLM' + Date.now(),
        policyId: this.data.policy.id,
        policyNumber: this.data.policy.policyNumber,
        claimNumber: `CLM/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`,
        dateOfLoss: formValue.dateOfLoss,
        typeOfLoss: formValue.typeOfLoss,
        description: formValue.description,
        estimatedLoss: formValue.estimatedLoss,
        status: 'Submitted',
        submittedDate: new Date(),
        documents: this.selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
      };
      this.isSubmitting = false;
      this.dialogRef.close(newClaim);
    }, 2000);
  }
}


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ CommonModule, RouterModule, MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule, MatChipsModule, MatCardModule, MatDialogModule, MatBadgeModule, MatSnackBarModule, MpesaPaymentModalComponent, ClaimRegistrationModalComponent ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  user: StoredUser | null = null;
  pendingQuotes: PendingQuote[] = [];
  page = 0;
  pageSize = 2;
  totalRecords = 0;
  navigationItems: NavigationItem[] = [];
  dashboardStats: DashboardStats = { marinePolicies: 0, travelPolicies: 0, pendingQuotes: 0, totalPremium: 0, activeClaims: 0 };
  private readonly STORAGE_KEYS = { USER_DATA: 'geminia_user_data' };
  activePolicies: Policy[] = [ { id: 'P001', type: 'marine', title: 'Machinery Import', policyNumber: 'MAR/2024/7531', status: 'active', premium: 18500, startDate: new Date('2024-08-01'), endDate: new Date('2024-09-30'), certificateUrl: '/simulated/MAR-2024-7531.pdf', hasClaim: true, marineDetails: { vesselName: 'MSC Isabella', cargoType: 'Containerized', tradeType: 'Import', modeOfShipment: 'Sea', marineProduct: 'Institute Cargo Clauses (A) - All Risks', marineCargoType: 'Machinery', origin: 'Germany', destination: 'Mombasa, Kenya', sumInsured: 3500000, descriptionOfGoods: 'Industrial-grade printing press machine, packed in a 40ft container.', ucrNumber: 'UCR202408153', idfNumber: 'E2300012345', clientInfo: { name: 'Bonface Odhiambo', idNumber: '30123456', kraPin: 'A001234567Z', email: 'bonface@example.com', phoneNumber: '0712345678' } } }, { id: 'P002', type: 'travel', title: 'Schengen Visa Travel Insurance', policyNumber: 'TRV/2024/9102', status: 'active', premium: 4800, startDate: new Date('2024-09-01'), endDate: new Date('2025-08-31'), certificateUrl: '/simulated/TRV-2024-9102.pdf' } ];
  claims: Claim[] = [ { id: 'CLM1678886400', policyId: 'P001', policyNumber: 'MAR/2024/7531', claimNumber: 'CLM/2024/83145', dateOfLoss: new Date('2024-08-15'), typeOfLoss: 'Damage', description: 'Container was dropped during offloading at the port, causing significant damage to the casing of the printing press.', estimatedLoss: 450000, status: 'Under Review', submittedDate: new Date('2024-08-18'), documents: [ { name: 'Damage_Photos.zip', size: 5242880, type: 'application/zip' }, { name: 'Survey_Report.pdf', size: 122880, type: 'application/pdf' } ] }];
  recentActivities: Activity[] = [ { id: 'A001', title: 'Payment Successful', description: 'Travel Insurance for Europe', timestamp: new Date(Date.now() - 3600000), icon: 'payment', iconColor: '#04b2e1', relatedId: 'P003' }, { id: 'A002', title: 'Certificate Downloaded', description: 'Marine Cargo Policy MAR-2025-002', timestamp: new Date(Date.now() - 14400000), icon: 'download', iconColor: '#04b2e1', relatedId: 'P002' }, { id: 'A003', title: 'Profile Updated', description: 'Contact information updated', timestamp: new Date(Date.now() - 86400000), icon: 'person', iconColor: '#21275c' }];
  notifications: Notification[] = [ { id: 'N001', title: 'Quotes Awaiting Payment', message: 'You have quotes that need payment to activate your policy.', timestamp: new Date(), read: false, actionUrl: '#pending-quotes' }, { id: 'N002', title: 'Certificates Ready', message: 'Your new policy certificates are ready for download.', timestamp: new Date(), read: false, actionUrl: '#active-policies' } ];
  isMobileSidebarOpen = false;
  expandedPolicyId: string | null = null;
  expandedClaimId: string | null = null;

  constructor(
    private dialog: MatDialog,
    public router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthenticationService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
          if(user){
              this.user = user;
              this.setupNavigationBasedOnRole('C');
          }
          else{
              this.router.navigate(['/sign-in']);
          }
      });
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
      const offset = this.page * this.pageSize;
      this.userService.getClientQuotes(offset, this.pageSize).subscribe({
          next: (res) => {
             this.pendingQuotes = res.pageItems;
             this.totalRecords = res.totalFilteredRecords || res.totalElements || 0;
             this.updateDashboardStats();
          },
          error: (err) => console.error('Error loading quotes', err)
      });
  }

    updateDashboardStats(): void {
        this.dashboardStats = {
            marinePolicies: this.activePolicies.filter(p => p.type === 'marine').length,
            travelPolicies: this.activePolicies.filter(p => p.type === 'travel').length,
            pendingQuotes: this.totalRecords,
            totalPremium: this.activePolicies.reduce((sum, p) => sum + p.premium, 0),
            activeClaims: this.claims.filter(c => c.status !== 'Settled' && c.status !== 'Rejected').length
        };
    }

    nextPage() {
        if ((this.page + 1) * this.pageSize < this.totalRecords) {
            this.page++;
            this.loadDashboardData();
        }
    }

    prevPage() {
        if (this.page > 0) {
            this.page--;
            this.loadDashboardData();
        }
    }

    scrollToSection(sectionId: string): void {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (this.isMobileSidebarOpen) {
            this.isMobileSidebarOpen = false;
        }
    }

  initiatePayment(quoteId: string): void {
    const quote = this.pendingQuotes.find((q) => q.id === quoteId);
    if (quote && this.user) {
      const paymentData: MpesaPayment = {
        amount: quote.netprem,
        phoneNumber: this.user.phoneNumber || '',
        reference: quote.id,
        description: quote.description
      };
      const dialogRef = this.dialog.open(MpesaPaymentModalComponent, { data: paymentData, panelClass: 'payment-modal-panel', autoFocus: false });
      dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: PaymentResult | null) => {
        if (result?.success) {
          this.snackBar.open(`Payment for "${quote.description}" was successful. Policy is now active.`, 'OK', {
            duration: 7000,
            panelClass: ['geminia-toast-panel']
          });
          this.loadDashboardData();
        }
      });
    }
  }

  editQuote(quoteId: string): void {
    this.router.navigate(['/marine-quote'], { queryParams: { editId: quoteId } });
  }

  deleteQuote(quoteId: string): void {
    if (confirm('Are you sure you want to delete this saved quote?')) {
      // SIMULATED: In a real app, you would call a service here.
      this.pendingQuotes = this.pendingQuotes.filter(q => q.id !== quoteId);
      this.totalRecords = this.pendingQuotes.length;
      this.updateDashboardStats();
      this.snackBar.open('Quote deleted successfully.', 'OK', {
        duration: 3000,
        panelClass: ['geminia-toast-panel']
      });
    }
  }

  logout(): void {
     this.authService.logout();
     this.router.navigate(['/sign-in'], { replaceUrl: true });
  }

    goToMarineQuote() {
        this.router.navigate(['/marine-quote']);
    }

  openClaimModal(policy: Policy): void {
    const dialogRef = this.dialog.open(ClaimRegistrationModalComponent, {
      data: { policy },
      panelClass: 'claim-modal-panel',
      autoFocus: false
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((newClaim: Claim | null) => {
      if (newClaim) {
        this.claims.unshift(newClaim);
        const policyToUpdate = this.activePolicies.find(p => p.id === newClaim.policyId);
        if (policyToUpdate) {
          policyToUpdate.hasClaim = true;
        }
        this.updateDashboardStats();
        this.snackBar.open(`Claim ${newClaim.claimNumber} has been submitted successfully.`, 'OK', {
          duration: 7000,
          panelClass: ['geminia-toast-panel']
        });
      }
    });
  }

    setupNavigationBasedOnRole(role: 'C' | 'A'): void {
        this.navigationItems = [
            { label: 'Dashboard', icon: 'dashboard', sectionId: 'main-dashboard-area' },
            { label: 'My Claims', icon: 'assignment_late', sectionId: 'my-claims-section' },
            {
                label: 'Marine Insurance', icon: 'directions_boat', isExpanded: true,
                children: [ { label: 'New Quote', route: '/marine-quote', icon: 'add_circle' } ]
            },
            { label: 'My Policies', icon: 'shield', sectionId: 'my-policies-section' },
            { label: 'Receipts', icon: 'receipt_long', route: '/receipts' }
        ];
    }

  // --- Utility and Display Methods ---
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) { if ((event.target as Window).innerWidth >= 1024) { this.isMobileSidebarOpen = false; } }
  togglePolicyDetails(policyId: string): void { this.expandedPolicyId = this.expandedPolicyId === policyId ? null : policyId; }
  toggleClaimDetails(claimId: string): void { this.expandedClaimId = this.expandedClaimId === claimId ? null : claimId; }
  getInitials(name: string): string { return name?.split(' ').map((n) => n[0]).join('').substring(0, 2) || ''; }
  getUnreadNotificationCount(): number { return this.notifications.filter((n) => !n.read).length; }
  toggleNavItem(item: NavigationItem): void { if (item.children) item.isExpanded = !item.isExpanded; }
  toggleMobileSidebar(): void { this.isMobileSidebarOpen = !this.isMobileSidebarOpen; }
  downloadCertificate(policyId: string): void { const policy = this.activePolicies.find((p) => p.id === policyId); if (policy?.certificateUrl) { const link = document.createElement('a'); link.href = policy.certificateUrl; link.download = `${policy.policyNumber}-certificate.pdf`; link.click(); } }
  markNotificationAsRead(notification: Notification): void { notification.read = true; if (notification.actionUrl) { document.querySelector(notification.actionUrl)?.scrollIntoView({ behavior: 'smooth' }); } }
  getClaimStatusClass(status: ClaimStatus): string {
    const statusMap: { [key in ClaimStatus]: string } = {
      'Submitted': 'status-submitted', 'Under Review': 'status-review', 'More Information Required': 'status-info-required', 'Approved': 'status-approved', 'Settled': 'status-settled', 'Rejected': 'status-rejected'
    };
    return statusMap[status] || '';
  }

    protected readonly Math = Math;
}