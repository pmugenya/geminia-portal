import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of, Subject, throwError } from 'rxjs';
import { catchError, delay, takeUntil, tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';

// --- Mock M-PESA Service (for demonstration) ---
// In a real application, this would be in its own file and make actual HTTP calls.
@Injectable({ providedIn: 'root' })
export class MpesaService {
  stkPush(amount: number, phoneNumber: string, reference: string): Observable<{ success: boolean; message: string }> {
    console.log(`Initiating STK Push for KES ${amount} to ${phoneNumber} with reference ${reference}`);

    // Simulate a network delay
    return of(null).pipe(
      delay(3000), // 3-second delay to simulate API call
      tap(() => {
        // Randomly decide if the payment succeeds or fails
        if (Math.random() > 0.2) { // 80% success rate
          console.log('M-PESA API Simulation: Success');
        } else {
          console.error('M-PESA API Simulation: Failure');
          throw new Error('The transaction was cancelled by the user.');
        }
      }),
      // Map to a success response
      // Note: In a real app, you'd poll a callback URL to confirm the transaction status.
      // This is a simplified success simulation.
      () => of({ success: true, message: 'Payment completed successfully.' }),
      catchError((error) => {
        return throwError(() => new Error(error.message || 'An unknown error occurred.'));
      })
    );
  }
}
// --- End of Mock Service ---


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
  template: `
    <div class="p-6 relative min-w-[320px] md:min-w-[400px]">
      <!-- Close Button -->
      <button mat-icon-button (click)="close(false)" class="absolute top-2 right-2" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
      </button>

      <h2 mat-dialog-title class="text-2xl font-semibold text-center mb-4">M-PESA Payment</h2>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="flex flex-col items-center justify-center text-center p-4 min-h-[200px]">
        <mat-spinner diameter="50"></mat-spinner>
        <p class="mt-4 font-medium text-gray-700">Sending request to your phone...</p>
        <p class="text-sm text-gray-500">Please enter your M-PESA PIN on your phone to complete the payment.</p>
      </div>

      <!-- Success State -->
      <div *ngIf="paymentStatus === 'success'" class="flex flex-col items-center justify-center text-center p-4 min-h-[200px]">
        <mat-icon class="text-green-500 !h-20 !w-20 text-6xl">check_circle</mat-icon>
        <p class="mt-4 text-xl font-semibold text-gray-800">Payment Successful!</p>
        <p class="text-sm text-gray-500 mb-6">Your policy will be sent to your email shortly.</p>
        <button mat-flat-button color="primary" (click)="close(true)">Done</button>
      </div>

      <!-- Error State -->
      <div *ngIf="paymentStatus === 'failed'" class="flex flex-col items-center justify-center text-center p-4 min-h-[200px]">
        <mat-icon class="text-red-500 !h-20 !w-20 text-6xl">error</mat-icon>
        <p class="mt-4 text-xl font-semibold text-gray-800">Payment Failed</p>
        <p class="text-sm text-gray-500 mb-6">{{ errorMessage }}</p>
        <div class="flex gap-4">
            <button mat-stroked-button (click)="close(false)">Cancel</button>
            <button mat-flat-button color="primary" (click)="resetAndTryAgain()">Try Again</button>
        </div>
      </div>

      <!-- Initial State -->
      <div *ngIf="!isLoading && paymentStatus === 'pending'" mat-dialog-content>
        <div class="text-center mb-6 bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600">Total Amount Payable</p>
            <p class="text-3xl font-bold text-slate-800">KES {{ data.amount | number:'1.2-2' }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ data.description }}</p>
        </div>

        <form [formGroup]="paymentForm" (ngSubmit)="initiatePayment()">
            <mat-form-field appearance="outline" class="w-full">
                <mat-label>M-PESA Phone Number</mat-label>
                <input matInput formControlName="phoneNumber" placeholder="0712345678" required>
                <mat-error *ngIf="paymentForm.get('phoneNumber')?.hasError('required')">Phone number is required</mat-error>
<!--                <mat-error *ngIf="paymentForm.get('phoneNumber')?.hasError('pattern')">Enter a valid Kenyan phone number</mat-error>-->
            </mat-form-field>

            <div mat-dialog-actions class="mt-4">
                <button mat-flat-button color="primary" class="w-full !py-6 !text-base" [disabled]="paymentForm.invalid || isLoading">
                    Pay Now
                </button>
            </div>
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
    private mpesaService: MpesaService // Using the mock service
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

    this.mpesaService.stkPush(this.data.amount, formValue.phoneNumber, this.data.reference)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Payment response:', response);
          this.isLoading = false;
          this.paymentStatus = 'success';
        },
        error: (err) => {
          console.error('Payment error:', err);
          this.isLoading = false;
          this.paymentStatus = 'failed';
          this.errorMessage = err.message || 'An unexpected error occurred.';
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
