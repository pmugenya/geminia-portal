import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuoteService } from './services/quote.service';


/**
 * Interface for the data passed TO the dialog.
 */
export interface PaymentData {
  amount: number;
  phoneNumber: string;
  reference: string;
  description: string;
}

/**
 * Interface for the result passed FROM the dialog when it closes.
 */
export interface PaymentResult {
  success: boolean;
}

@Component({
  selector: 'app-mpesa-payment-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
  ],
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
      color: white;
      position: relative;
    }

    .header-icon-wrapper {
      width: 48px;
      height: 48px;
      background-color: rgba(255, 255, 255, .1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
    }

    .header-icon-wrapper mat-icon {
      color: #04b2e1;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .header-text-content {
      flex-grow: 1;
    }

    .modal-title {
      color: white;
      font-size: 22px;
      font-weight: 700;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 14px;
      opacity: .8;
      margin-top: 4px;
    }

    .close-button {
      position: absolute;
      top: 12px;
      right: 12px;
      color: white;
    }

    .modal-content {
      padding: 24px;
      background-color: #f8f9fa;
    }

    .instruction-text {
      text-align: center;
      color: #495057;
      font-size: 15px;
      margin-bottom: 20px;
      font-weight: 600;
    }

    mat-form-field {
      width: 100%;
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
      height: 52px;
      font-size: 16px;
      width: 100%;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #21275c;
    }

    .btn-primary:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .status-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 24px;
      min-height: 250px;
    }

    .status-icon {
      font-size: 80px !important;
      width: 80px !important;
      height: 80px !important;
      margin-bottom: 20px;
    }

    .status-icon.success {
      color: #10b981;
    }

    .status-icon.error {
      color: #ef4444;
    }

    .status-title {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .status-subtitle {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 24px;
    }

    .loading-spinner {
      margin-bottom: 20px;
    }

    .loading-text {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .loading-subtext {
      font-size: 13px;
      color: #6b7280;
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
      .modal-content {
        padding: 16px;
      }
    }
  `],
  template: `
    <div class="payment-modal-container">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-icon-wrapper">
          <mat-icon>payment</mat-icon>
        </div>
        <div class="header-text-content">
          <h1 mat-dialog-title class="modal-title">Complete Your Payment</h1>
          <p class="modal-subtitle">Pay KES {{ data.amount | number: '1.2-2' }} for {{ data.description }}</p>
        </div>
        <button mat-icon-button (click)="close(false)" class="close-button" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="status-container">
        <mat-spinner class="loading-spinner" diameter="60"></mat-spinner>
        <p class="loading-text">Sending request to your phone...</p>
        <p class="loading-subtext">Please enter your M-PESA PIN on your phone to complete the payment.</p>
      </div>

      <!-- Success State -->
      <div *ngIf="paymentStatus === 'success'" class="status-container">
        <mat-icon class="status-icon success">check_circle</mat-icon>
        <p class="status-title">Payment Successful!</p>
        <p class="status-subtitle">Your policy will be sent to your email shortly.</p>
        <button class="btn-primary" (click)="close(true)">Done</button>
      </div>

      <!-- Error State -->
      <div *ngIf="paymentStatus === 'failed'" class="status-container">
        <mat-icon class="status-icon error">error</mat-icon>
        <p class="status-title">Payment Failed</p>
        <p class="status-subtitle">{{ errorMessage }}</p>
        <div style="display: flex; gap: 12px; width: 100%;">
          <button mat-stroked-button style="flex: 1;" (click)="close(false)">Cancel</button>
          <button class="btn-primary" style="flex: 1;" (click)="resetAndTryAgain()">Try Again</button>
        </div>
      </div>

      <!-- Initial State -->
      <div *ngIf="!isLoading && paymentStatus === 'pending'" class="modal-content">
        <p class="instruction-text">Enter your M-PESA number to receive a payment prompt</p>
        <form [formGroup]="paymentForm" (ngSubmit)="initiatePayment()" (keydown.enter)="initiatePayment()">
          <mat-form-field appearance="outline">
            <input matInput formControlName="phoneNumber" placeholder="e.g., 0712345678" required (keydown.enter)="initiatePayment()">
            <mat-icon matSuffix>phone_iphone</mat-icon>
            <mat-error *ngIf="paymentForm.get('phoneNumber')?.hasError('required')">Phone number is required</mat-error>
          </mat-form-field>

          <button class="btn-primary" type="submit" [disabled]="paymentForm.invalid || isLoading">
            <mat-spinner *ngIf="isLoading" diameter="24" style="margin-right: 8px;"></mat-spinner>
            <span *ngIf="!isLoading">Pay KES {{ data.amount | number: '1.2-2' }}</span>
            <span *ngIf="isLoading">Processing...</span>
          </button>
        </form>
      </div>
    </div>
  `
})
export class MpesaPaymentModalComponent implements OnInit, OnDestroy {
  isLoading = false;
  paymentStatus: 'pending' | 'success' | 'failed' = 'pending';
  errorMessage: string | null = null;
  paymentForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<MpesaPaymentModalComponent, PaymentResult>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentData,
    private fb: FormBuilder,
    private quoteService: QuoteService
  ) {}

  ngOnInit(): void {
    this.paymentForm = this.fb.group({
      phoneNumber: [this.data.phoneNumber, [
        Validators.required
        // Validators.pattern(/^0[17]\d{8}$/)
      ]]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initiatePayment(): void {
    if (this.paymentForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formValue = this.paymentForm.value;

    // Call real M-Pesa STK Push API (same as marine quote)
    this.quoteService.stkPush(formValue.phoneNumber, this.data.amount, this.data.reference)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('M-Pesa STK Push response:', response);
          this.isLoading = false;
          this.paymentStatus = 'success';
        },
        error: (err) => {
          console.error('M-Pesa payment error:', err);
          this.isLoading = false;
          this.paymentStatus = 'failed';
          this.errorMessage = err?.error?.message || err?.message || 'Payment failed. Please try again.';
        }
      });
  }

  resetAndTryAgain(): void {
    this.paymentStatus = 'pending';
    this.errorMessage = null;
    this.isLoading = false;
  }

  close(isSuccess: boolean): void {
    this.dialogRef.close({ success: isSuccess });
  }
}
