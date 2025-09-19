import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { FuseAlertComponent } from '@fuse/components/alert';
import { finalize } from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';
import { UserService } from '../../../core/user/user.service';
import { CreateUserObject } from '../../../core/user/user.types';

export interface Alert {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    position?: 'inline' | 'bottom';
}

// Validator to check if 'password' and 'confirmPassword' fields match.
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    return password && confirmPassword && password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

@Component({
    selector: 'auth-sign-in',
    templateUrl: './sign-in.component.html',
    styleUrls: ['./sign-in.component.scss'],
    standalone: true,
    imports: [
        CommonModule, RouterModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
        MatInputModule, MatIconModule, MatProgressSpinnerModule, MatCheckboxModule,
        MatRadioModule, FuseAlertComponent,
    ],
})
export class AuthSignInComponent implements OnInit {
    showAlert: boolean = false;
    alert: Alert = { type: 'error', message: '' };
    signInForm: FormGroup;
    registerForm: FormGroup;
    formType: 'login' | 'register' = 'login';
    showPassword = false;
    showTermsModal = false;
    showDataPrivacyModal = false;
    loginState: 'credentials' | 'otp' = 'credentials';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private userService: UserService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        this.signInForm = this.fb.group({
            username: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required],
            otp: [''], // OTP is not required initially
            agreementAccepted: [false, Validators.requiredTrue],
        });

        // The registration form now includes 'confirmPassword' and the passwordMatchValidator.
        this.registerForm = this.fb.group({
            accountType: ['C', Validators.required],
            fullName: ['', [Validators.required, this.fullNameValidator]],
            email: ['', [Validators.required, Validators.email]],
            kraPin: ['', [Validators.required, this.kraPinValidator]],
            phoneNumber: ['', [Validators.required, this.phoneNumberValidator]],
            iraNumber: [''],
            pinNumber: [''],
            password: ['', [Validators.required, this.strongPasswordValidator]],
            confirmPassword: ['', Validators.required],
            agreementAccepted: [false, Validators.requiredTrue],
        }, { validators: passwordMatchValidator }); // Validator applied at the form group level

        // This logic correctly switches validators based on account type
        this.registerForm.get('accountType')?.valueChanges.subscribe((accountType) => {
            this.clearAllValidators();
            if (accountType === 'C') {
                this.setIndividualValidators();
            } else if (accountType === 'A') {
                this.setIntermediaryValidators();
            }
            // Update the validity of all controls
            Object.keys(this.registerForm.controls).forEach(key => {
                this.registerForm.get(key).updateValueAndValidity();
            });
        });

        this.setIndividualValidators(); // Set initial validators for the default 'Individual' type
    }

    // --- Form Control Accessors for cleaner template code ---
    get password() { return this.registerForm.get('password'); }
    get confirmPassword() { return this.registerForm.get('confirmPassword'); }

    // --- Custom Validators ---
    fullNameValidator(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const names = control.value.trim().split(' ').filter((name: string) => name.length > 0);
        return names.length >= 2 ? null : { fullNameInvalid: true };
    }

    kraPinValidator(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        return /^[A-Za-z]\d{9}[A-Za-z]$/.test(control.value) ? null : { kraPinInvalid: true };
    }

    phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        return /^\+254\d{9,12}$/.test(control.value) ? null : { phoneNumberInvalid: true };
    }

    strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const value = control.value;
        const valid = /(?=.*[a-z])/.test(value) && /(?=.*[A-Z])/.test(value) && /(?=.*\d)/.test(value) && /(?=.*[@$!%*?&])/.test(value) && value.length >= 8;
        return valid ? null : { strongPasswordInvalid: true };
    }

    // --- Password strength helper methods for the HTML template ---
    hasMinLength(password: string): boolean { return !!password && password.length >= 8; }
    hasLowercase(password: string): boolean { return !!password && /(?=.*[a-z])/.test(password); }
    hasUppercase(password: string): boolean { return !!password && /(?=.*[A-Z])/.test(password); }
    hasNumber(password: string): boolean { return !!password && /(?=.*\d)/.test(password); }
    hasSpecialChar(password: string): boolean { return !!password && /(?=.*[@$!%*?&])/.test(password); }

    // --- Dynamic Validator Management ---
    private clearAllValidators(): void {
        const fields = ['fullName', 'email', 'kraPin', 'phoneNumber', 'iraNumber', 'pinNumber'];
        fields.forEach(field => this.registerForm.get(field)?.clearValidators());
    }

    private setIndividualValidators(): void {
        this.registerForm.get('fullName')?.setValidators([Validators.required, this.fullNameValidator]);
        this.registerForm.get('email')?.setValidators([Validators.required, Validators.email]);
        this.registerForm.get('kraPin')?.setValidators([Validators.required, this.kraPinValidator]);
        this.registerForm.get('phoneNumber')?.setValidators([Validators.required, this.phoneNumberValidator]);
    }

    private setIntermediaryValidators(): void {
        this.registerForm.get('iraNumber')?.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9]{5,15}$/)]);
        this.registerForm.get('pinNumber')?.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9]{10}$/)]);
    }

    // --- Input Formatting ---
    onKraPinChange(event: any): void {
        let value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        this.registerForm.get('kraPin')?.setValue(value.substring(0, 11), { emitEvent: false });
    }

    onPhoneNumberChange(event: any): void {
        let value = event.target.value.replace(/[^\d+]/g, '');
        if (!value.startsWith('+254') && value.length > 0) {
            if (value.startsWith('0')) value = '+254' + value.substring(1);
            else if (value.startsWith('254')) value = '+' + value;
            else if (!value.startsWith('+')) value = '+254' + value;
        }
        this.registerForm.get('phoneNumber')?.setValue(value.substring(0, 13), { emitEvent: false });
    }
    
    // --- NOTE ---
    // The old `signIn()` method was removed from here because it was unused.
    // The button in the HTML correctly calls `handleSignIn()` below.

    /**
     * Main submission handler for the login form. This is the function called by the button.
     * It acts as a router, directing to the correct submission logic based on the login state.
     */
    handleSignIn(): void {
        if (this.signInForm.invalid) return;
        this.loginState === 'credentials' ? this.submitCredentials() : this.verifyOtp();
    }

    /**
     * Step 1 of login: Submits username and password.
     */
    submitCredentials(): void {
        this.signInForm.disable();
        this.showAlert = false;
        const { username, password } = this.signInForm.getRawValue();
        this.authService.signIn({ username, password }).pipe(
            finalize(() => this.signInForm.enable())
        ).subscribe({
            next: (res: any) => {
                if (res.tempToken) {
                    this.authService.tempToken = res.tempToken;
                    this.loginState = 'otp';
                } else {
                    this.alert = { type: 'error', message: 'Login failed: Invalid response.' };
                    this.showAlert = true;
                }
            },
            error: (err) => {
                this.alert = { type: 'error', message: err.error?.errors?.[0]?.developerMessage || 'Wrong email or password.' };
                this.showAlert = true;
            },
        });
    }

    /**
     * Step 2 of login: Verifies the OTP code.
     */
    verifyOtp(): void {
        if (!this.authService.tempToken) { this.backToCredentials(); return; }
        this.signInForm.disable();
        this.showAlert = false;
        const { otp } = this.signInForm.value;
        this.authService.verifyOtp({ tempToken: this.authService.tempToken, otp }).pipe(
            finalize(() => this.signInForm.enable())
        ).subscribe({
            next: () => this.router.navigate(['/sign-up/dashboard']),
            error: (err) => {
                this.alert = { type: 'error', message: err.message || 'Invalid OTP code.' };
                this.showAlert = true;
            },
        });
    }

    /**
     * Handles the registration form submission.
     */
    register(): void {
        if (this.registerForm.invalid) return;
        this.registerForm.disable();
        const formValue = this.registerForm.getRawValue();
        const user: CreateUserObject = {
            password: formValue.password,
            passwordConfirm: formValue.confirmPassword,
            pinNumber: formValue.kraPin,
            mobileno: formValue.phoneNumber,
            docnumber: formValue.iraNumber,
            firstName: formValue.fullName,
            email: formValue.email,
            clientType: formValue.accountType
        };

        this.userService.createUser(user).pipe(
            finalize(() => this.registerForm.enable())
        ).subscribe({
            next: () => {
                this.alert = { type: 'success', message: 'Registration successful! Please sign in.', position: 'bottom' };
                this.showAlert = true;
                this.formType = 'login';
                setTimeout(() => this.showAlert = false, 5000);
            },
            error: (err) => {
                this.alert = { type: 'error', message: err.error?.errors?.[0]?.developerMessage || 'Registration failed.' };
                this.showAlert = true;
            },
        });
    }

    /**
     * Resets the UI back to the initial credential state from the OTP view.
     */
    backToCredentials(): void {
        this.loginState = 'credentials';
        this.showAlert = false;
        this.authService.clearTempToken();
        this.signInForm.get('otp')?.reset();
    }

    // --- UI Helpers ---
    togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }
    getCurrentDate(): string { return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
}