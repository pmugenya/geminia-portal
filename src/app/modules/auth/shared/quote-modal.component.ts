import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

export interface QuoteModalData {
    insuranceType: 'marine' | 'motor';
}

@Component({
    selector: 'app-quote-modal',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSelectModule,
    ],
    templateUrl: './quote-modal.component.html',
    styleUrls: ['./quote-modal.component.scss']
})
export class QuoteModalComponent implements OnInit {
    quoteForm: UntypedFormGroup;
    isSubmitting = false;
    insuranceType: string;

    counties = [
        'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi',
        'Kitale', 'Garissa', 'Kakamega', 'Machakos', 'Meru', 'Nyeri', 'Kericho',
        'Embu', 'Migori', 'Homa Bay', 'Kilifi', 'Lamu', 'Isiolo', 'Marsabit',
        'Wajir', 'Mandera', 'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia',
        'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia',
        'Nyandarua', 'Kirinyaga', 'Murang\'a', 'Kiambu', 'Kajiado',
        'Makueni', 'Kitui', 'Tana River', 'Taita-Taveta', 'Kwale'
    ];

    constructor(
        private _formBuilder: UntypedFormBuilder,
        private _dialogRef: MatDialogRef<QuoteModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: QuoteModalData
    ) {
        this.insuranceType = data.insuranceType;
    }

    ngOnInit(): void {
        this.quoteForm = this._formBuilder.group({
            fullName: ['', Validators.required],
            phoneNumber: ['', [Validators.required, Validators.pattern(/^(\+254|0)[17]\d{8}$/)]],
            email: ['', [Validators.email]],
            location: ['']
        });
    }

    submitQuote(): void {
        if (this.quoteForm.invalid) {
            this.markFormGroupTouched();
            return;
        }

        this.isSubmitting = true;

        setTimeout(() => {
            const quoteData = {
                ...this.quoteForm.value,
                insuranceType: this.insuranceType,
                timestamp: new Date().toISOString()
            };

            console.log('Quote request submitted:', quoteData);
            
            this._dialogRef.close({
                success: true,
                data: quoteData
            });
        }, 2000);
    }

    closeModal(): void {
        this._dialogRef.close();
    }

    private markFormGroupTouched(): void {
        Object.keys(this.quoteForm.controls).forEach(key => {
            const control = this.quoteForm.get(key);
            control?.markAsTouched();
        });
    }

    getErrorMessage(fieldName: string): string {
        const control = this.quoteForm.get(fieldName);
        
        if (control?.hasError('required')) {
            return `${this.getFieldDisplayName(fieldName)} is required`;
        }
        
        if (control?.hasError('email')) {
            return 'Please enter a valid email address';
        }
        
        if (control?.hasError('pattern') && fieldName === 'phoneNumber') {
            return 'Please enter a valid Kenyan phone number';
        }
        
        return '';
    }

    private getFieldDisplayName(fieldName: string): string {
        const displayNames: { [key: string]: string } = {
            fullName: 'Full Name',
            phoneNumber: 'Phone Number',
            email: 'Email Address',
            location: 'Location'
        };
        
        return displayNames[fieldName] || fieldName;
    }
}