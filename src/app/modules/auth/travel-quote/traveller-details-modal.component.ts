import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';

// --- INTERFACES ---
export interface TravellerData {
    fullName: string;
    dateOfBirth: string;
    isMinor: boolean;
}

export interface TravellerDetailsModalData {
    travellers: TravellerData[];
}

export interface TravellerDetailsFormOutput {
    travellers: {
        kraPin?: string;
        nationalId?: string;
        passportNumber: string;
    }[];
}

@Component({
    selector: 'app-traveller-details-modal',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatDialogModule
    ],
    template: `
        <div class="modal-container">
            <div class="modal-header">
                <div class="header-icon-wrapper"><mat-icon>group</mat-icon></div>
                <div>
                    <h1 mat-dialog-title class="modal-title">Traveller Details</h1>
                    <p class="modal-subtitle">Please provide the required details for all travellers.</p>
                </div>
                <button mat-icon-button (click)="closeDialog()" class="close-button" aria-label="Close dialog">
                    <mat-icon>close</mat-icon>
                </button>
            </div>
            <mat-dialog-content class="modal-content">
                <form [formGroup]="travellersForm">
                    <div formArrayName="travellers">
                        <div *ngFor="let traveller of travellersArray.controls; let i = index" [formGroupName]="i" class="traveller-form-section">
                            <h3 class="traveller-name-title">{{ data.travellers[i].fullName }} <span *ngIf="data.travellers[i].isMinor">(Minor)</span></h3>
                            
                                                        <mat-form-field appearance="outline" *ngIf="!data.travellers[i].isMinor">
                                <mat-label>KRA PIN</mat-label>
                                <input matInput formControlName="kraPin" placeholder="e.g., A123456789Z" (input)="removeWhitespace($event, 'kraPin', i)">
                                <mat-error *ngIf="traveller.get('kraPin')?.hasError('required')">KRA PIN is required.</mat-error>
                                <mat-error *ngIf="traveller.get('kraPin')?.hasError('pattern')">Invalid KRA PIN format (e.g., A123456789Z).</mat-error>
                            </mat-form-field>

                            <mat-form-field appearance="outline" *ngIf="!data.travellers[i].isMinor">
                                <mat-label>National ID (Optional)</mat-label>
                                <input matInput formControlName="nationalId" placeholder="e.g., 12345678">
                            </mat-form-field>

                                                        <mat-form-field appearance="outline">
                                <mat-label>Passport Number</mat-label>
                                <input matInput formControlName="passportNumber" placeholder="e.g., BG045953" (input)="removeWhitespace($event, 'passportNumber', i)">
                                <mat-error *ngIf="traveller.get('passportNumber')?.hasError('required')">Passport Number is required.</mat-error>
                                <mat-error *ngIf="traveller.get('passportNumber')?.hasError('pattern')">Invalid Passport format (e.g., BG045953).</mat-error>
                            </mat-form-field>
                        </div>
                    </div>
                </form>
            </mat-dialog-content>
            <mat-dialog-actions align="end">
                 <button mat-stroked-button (click)="closeDialog()">Cancel</button>
                <button class="btn-primary" (click)="submitDetails()" [disabled]="travellersForm.invalid || isSubmitting">
                    <mat-spinner *ngIf="isSubmitting" diameter="24"></mat-spinner>
                    <span *ngIf="!isSubmitting">Proceed to Pay</span>
                </button>
            </mat-dialog-actions>
        </div>
    `,
    styles: [`
    :host {
        --primary-color: #04b2e1;    /* Pantone 306C */
        --hover-color: #21275c;      /* Pantone 2758C */
        --brand-color: #21275c;
        --white-color: #ffffff;
        --light-gray: #f8f9fa;
        --medium-gray: #e9ecef;
        --dark-gray: #495057;
    }
    .modal-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 90vh; /* Limit height to 90% of the viewport height */
        background-color: var(--white-color);
        border-radius: 16px;
        overflow: hidden;
        width: 100%;
        max-width: 500px;
    }
    .modal-header {
        display: flex;
        align-items: center;
        padding: 20px 24px;
        background-color: var(--brand-color);
        color: var(--white-color);
        position: relative;
    }
    .header-icon-wrapper {
        width: 48px;
        height: 48px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 16px;
        flex-shrink: 0;
    }
    .header-icon-wrapper mat-icon {
        color: var(--primary-color);
        font-size: 28px;
        width: 28px;
        height: 28px;
    }
    .modal-title {
        font-size: 22px;
        font-weight: 700;
        margin: 0;
        color: var(--white-color);
    }
    .modal-subtitle {
        font-size: 14px;
        opacity: 0.9;
        margin-top: 4px;
        color: var(--white-color);
    }
    .close-button {
        position: absolute;
        top: 12px;
        right: 12px;
        color: var(--white-color);
    }
    .modal-content {
        flex-grow: 1; /* Allow content to take up available space */
        overflow-y: auto; /* Enable vertical scrolling */
        padding: 24px;
        background-color: #f9f9f9;
    }
    .traveller-form-section {
        background: var(--white-color);
        border: 1px solid var(--medium-gray);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        transition: box-shadow 0.2s;
    }
    .traveller-form-section:focus-within {
        box-shadow: 0 4px 12px rgba(4, 178, 225, 0.1);
        border-color: var(--primary-color);
    }
    .traveller-name-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--brand-color);
        margin-bottom: 16px;
    }
    mat-form-field {
        width: 100%;
    }
    mat-dialog-actions {
        padding: 16px 24px;
        background-color: var(--light-gray);
        border-top: 1px solid var(--medium-gray);
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
        background-color: var(--primary-color);
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: background-color 0.2s;
        height: 52px;
        font-size: 16px;
    }
    .btn-primary:hover:not(:disabled) {
        background-color: var(--hover-color);
    }
    .btn-primary:disabled {
        background-color: #9ca3af;
        cursor: not-allowed;
        opacity: 0.7;
    }
    `]
})
export class TravellerDetailsModalComponent implements OnInit {
    travellersForm: FormGroup;
    isSubmitting = false;

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<TravellerDetailsModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: TravellerDetailsModalData
    ) {
        this.travellersForm = this.fb.group({
            travellers: this.fb.array([])
        });
    }

    ngOnInit(): void {
        this.data.travellers.forEach(traveller => {
            this.addTraveller(traveller);
        });
    }

    get travellersArray(): FormArray {
        return this.travellersForm.get('travellers') as FormArray;
    }

        addTraveller(traveller: TravellerData): void {
        const group = this.fb.group({
            passportNumber: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}[0-9]{6}$/)]],
            kraPin: ['', [Validators.pattern(/^[A-Z][0-9]{9}[A-Z]$/)]],
            nationalId: ['']
        });

        if (!traveller.isMinor) {
            group.get('kraPin')?.setValidators(Validators.required);
        }

        this.travellersArray.push(group);
    }

    closeDialog(result: TravellerDetailsFormOutput | null = null): void {
        this.dialogRef.close(result);
    }

    submitDetails(): void {
        if (this.travellersForm.invalid) {
            return;
        }

        this.isSubmitting = true;
        // Simulate a short delay for UX
        setTimeout(() => {
            this.isSubmitting = false;
            const output: TravellerDetailsFormOutput = this.travellersForm.value;
            this.closeDialog(output);
        }, 1000);
    }

    // Removes all whitespace from an input field
    removeWhitespace(event: Event, controlName: string, groupIndex: number): void {
        const input = event.target as HTMLInputElement;
        const originalValue = input.value;
        const sanitizedValue = originalValue.replace(/\s+/g, '');

        if (originalValue !== sanitizedValue) {
            const control = (this.travellersForm.get('travellers') as FormArray).at(groupIndex).get(controlName);
            control?.setValue(sanitizedValue);
        }
    }
}
