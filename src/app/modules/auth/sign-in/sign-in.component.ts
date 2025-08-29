import { Component, OnInit } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    Validators,
    ReactiveFormsModule,
    ValidatorFn,
    AbstractControl,
    ValidationErrors,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
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
import { UserService } from '../../../core/user/user.service';
import { CreateUserObject } from '../../../core/user/user.types';

export interface Alert {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    position?: 'inline' | 'bottom';
}

export interface PasswordStrength {
    level: number;
    text: string;
    color: string;
}
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
        return null; // controls not yet initialized
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

@Component({
    selector: 'auth-sign-in',
    templateUrl: './sign-in.component.html',
    styleUrls: ['./sign-in.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatCheckboxModule,
        MatRadioModule,
        FuseAlertComponent,
    ],
})


// This 'export' keyword makes the component importable in other files like your routes file.
export class AuthSignInComponent implements OnInit {
    // --- PROPERTIES ---
    showAlert: boolean = false;
    alert: Alert = { type: 'error', message: '' };
    signInForm: FormGroup;
    registerForm: FormGroup;
    formType: 'login' | 'register' = 'login';
    showPassword = false;
    showTermsModal = false;
    showDataPrivacyModal = false;
    loginState: 'credentials' | 'otp' = 'credentials';
    
    // OTP Resend functionality properties
    resendCooldown = 0;
    resendTimer: any;
    isResending = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private userService: UserService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.signInForm = this.fb.group({
            username: [
                'individual@geminia.com',
                [Validators.required, Validators.email],
            ],
            password: ['password123', Validators.required],
            otp: [''],
            agreementAccepted: [false, Validators.requiredTrue],
        });

        this.registerForm = this.fb.group({
            accountType: ['individual', Validators.required],
            fullName: ['', [Validators.required, this.fullNameValidator]],
            email: ['', [Validators.required, Validators.email]],
            kraPin: ['', [Validators.required, this.kraPinValidator]],
            phoneNumber: ['', [Validators.required, this.phoneNumberValidator]],
            iraNumber: [''],
            pinNumber: [''],
            password: ['', [Validators.required, this.strongPasswordValidator]],
            agreementAccepted: [false, Validators.requiredTrue],
        });

        // Conditional Validation Logic
        this.registerForm
            .get('accountType')
            ?.valueChanges.subscribe((accountType) => {
                this.clearIndividualValidators();
                this.clearIntermediaryValidators();

                if (accountType === 'individual') {
                    this.setIndividualValidators();
                } else if (accountType === 'intermediary') {
                    this.setIntermediaryValidators();
                }

                this.registerForm.updateValueAndValidity();
            });

        // Initially set validators for the default 'individual' type
        this.setIndividualValidators();
    }

    // Custom validators
    fullNameValidator(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const names = control.value
            .trim()
            .split(' ')
            .filter((name: string) => name.length > 0);
        return names.length >= 2 ? null : { fullNameInvalid: true };
    }

    kraPinValidator(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const kraPattern = /^[A-Za-z]\d{9}[A-Za-z]$/;
        return kraPattern.test(control.value) ? null : { kraPinInvalid: true };
    }

    phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const phonePattern = /^\+254\d{9,12}$/;
        return phonePattern.test(control.value)
            ? null
            : { phoneNumberInvalid: true };
    }

    strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;

        const value = control.value;
        const hasMinLength = value.length >= 8;
        const hasLowerCase = /(?=.*[a-z])/.test(value);
        const hasUpperCase = /(?=.*[A-Z])/.test(value);
        const hasNumber = /(?=.*\d)/.test(value);
        const hasSpecialChar = /(?=.*[@$!%*?&])/.test(value);

        const valid =
            hasMinLength &&
            hasLowerCase &&
            hasUpperCase &&
            hasNumber &&
            hasSpecialChar;
        return valid ? null : { strongPasswordInvalid: true };
    }

    // Password validation helper methods (used in HTML)
    hasMinLength(password: string): boolean {
        return password ? password.length >= 8 : false;
    }

    hasLowercase(password: string): boolean {
        return password ? /(?=.*[a-z])/.test(password) : false;
    }

    hasUppercase(password: string): boolean {
        return password ? /(?=.*[A-Z])/.test(password) : false;
    }

    hasNumber(password: string): boolean {
        return password ? /(?=.*\d)/.test(password) : false;
    }

    hasSpecialChar(password: string): boolean {
        return password ? /(?=.*[@$!%*?&])/.test(password) : false;
    }

    private clearIndividualValidators(): void {
        this.registerForm.get('fullName')?.clearValidators();
        this.registerForm.get('email')?.clearValidators();
        this.registerForm.get('kraPin')?.clearValidators();
        this.registerForm.get('phoneNumber')?.clearValidators();
        this.registerForm.get('fullName')?.updateValueAndValidity();
        this.registerForm.get('email')?.updateValueAndValidity();
        this.registerForm.get('kraPin')?.updateValueAndValidity();
        this.registerForm.get('phoneNumber')?.updateValueAndValidity();
    }

    private setIndividualValidators(): void {
        this.registerForm
            .get('fullName')
            ?.setValidators([Validators.required, this.fullNameValidator]);
        this.registerForm
            .get('email')
            ?.setValidators([Validators.required, Validators.email]);
        this.registerForm
            .get('kraPin')
            ?.setValidators([Validators.required, this.kraPinValidator]);
        this.registerForm
            .get('phoneNumber')
            ?.setValidators([Validators.required, this.phoneNumberValidator]);
        this.registerForm.get('fullName')?.updateValueAndValidity();
        this.registerForm.get('email')?.updateValueAndValidity();
        this.registerForm.get('kraPin')?.updateValueAndValidity();
        this.registerForm.get('phoneNumber')?.updateValueAndValidity();
    }

    private clearIntermediaryValidators(): void {
        this.registerForm.get('iraNumber')?.clearValidators();
        this.registerForm.get('pinNumber')?.clearValidators();
        this.registerForm.get('iraNumber')?.updateValueAndValidity();
        this.registerForm.get('pinNumber')?.updateValueAndValidity();
    }

    private setIntermediaryValidators(): void {
        this.registerForm
            .get('iraNumber')
            ?.setValidators([
                Validators.required,
                Validators.pattern(/^[A-Za-z0-9]{5,15}$/),
            ]);
        this.registerForm
            .get('pinNumber')
            ?.setValidators([
                Validators.required,
                Validators.pattern(/^[A-Za-z0-9]{10}$/),
            ]);
        this.registerForm.get('iraNumber')?.updateValueAndValidity();
        this.registerForm.get('pinNumber')?.updateValueAndValidity();
    }

    // Input formatting methods
    onKraPinChange(event: any): void {
        let value = event.target.value.toUpperCase();
        value = value.replace(/[^A-Z0-9]/g, '');
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        this.registerForm.get('kraPin')?.setValue(value);
    }

    onPhoneNumberChange(event: any): void {
        let value = event.target.value;
        value = value.replace(/[^\d+]/g, '');

        if (!value.startsWith('+254') && value.length > 0) {
            if (value.startsWith('0')) {
                value = '+254' + value.substring(1);
            } else if (value.startsWith('254')) {
                value = '+' + value;
            } else if (!value.startsWith('+')) {
                value = '+254' + value;
            }
        }

        if (value.length > 13) {
            value = value.substring(0, 13);
        }

        this.registerForm.get('phoneNumber')?.setValue(value);
    }

    // Password strength checker
    getPasswordStrength(password: string): PasswordStrength {
        if (!password) {
            return { level: 0, text: 'No password', color: 'text-gray-400' };
        }

        let score = 0;
        const checks = [
            password.length >= 8,
            /(?=.*[a-z])/.test(password),
            /(?=.*[A-Z])/.test(password),
            /(?=.*\d)/.test(password),
            /(?=.*[@$!%*?&])/.test(password),
        ];

        score = checks.filter((check) => check).length;

        const strengthLevels = [
            { level: 1, text: 'Very Weak', color: 'text-red-500' },
            { level: 2, text: 'Weak', color: 'text-red-500' },
            { level: 3, text: 'Fair', color: 'text-yellow-500' },
            { level: 4, text: 'Good', color: 'text-blue-500' },
            { level: 5, text: 'Strong', color: 'text-green-500' },
        ];

        return strengthLevels[Math.max(0, score - 1)] || strengthLevels[0];
    }

    signIn(): void {
        if (this.signInForm.invalid) {
            this.alert = {
                type: 'error',
                message:
                    'Please enter a valid email and password and accept the terms.',
                position: 'bottom',
            };
            this.showAlert = true;

            // Set a timeout to hide the alert message after 3 seconds
            setTimeout(() => {
                this.showAlert = false;
                this.alert = null; // Clear the alert message
            }, 3000); // 3000 milliseconds = 3 seconds
        }
    }

    /**
     * Main submission handler for the login form.
     */
    handleSignIn(): void {
        if (this.loginState === 'credentials') {
            this.submitCredentials();
        } else {
            this.verifyOtp();
        }
    }
        /**
     * Step 1: Submits credentials, expecting a temporary token in the response.
     */
    submitCredentials(): void {
        console.log('loggin in...');
        this.signInForm.disable();
        this.showAlert = false;
        this.isResending = true; // For showing a loading spinner
        const { username, password } = this.signInForm.getRawValue();
        const credentials = { username, password };

        this.authService.signIn(credentials).pipe(
            finalize(() => {
                this.signInForm.get('username').enable();
                this.signInForm.get('password').enable();
                this.isResending = false; // Hide the loading spinner
            })
        ).subscribe({
            next: (res: any) => {
                const token = res.tempToken;
                if (token && typeof token === 'string') {
                    this.authService.tempToken = token;
                    console.log('✅ Temporary token saved.');
                    this.loginState = 'otp';
                    this.signInForm.get('otp').enable();
                    this.startResendCooldown(); // Start cooldown when OTP screen is shown
                } else {
                    this.alert = { type: 'error', message: 'Login failed: Invalid response from server.', position: 'inline' };
                    this.showAlert = true;
                }
            },
            error: (err) => {
                this.alert = { type: 'error', message: err.error.errors[0].developerMessage || 'Wrong email or password.', position: 'inline' };
                this.showAlert = true;
            }
        });
    }

    /**
     * Step 2: Verifies the temporary token and OTP.
     * On success, navigates to the dashboard.
     */
    verifyOtp(): void {
        const tempToken = this.authService.tempToken;
        console.log(tempToken);
        if (!tempToken) {
            this.backToCredentials();
            return;
        }

        this.signInForm.disable();
        this.showAlert = false;

        const { otp } = this.signInForm.value;
        const credentials = { tempToken, otp };

        this.authService.verifyOtp(credentials).subscribe({
            next: (res) => {
                // handle success: save final JWT, navigate, etc.
                this.router.navigate(['/sign-up/dashboard']);
            },
            error: (err: any) => {
                const errorMessage = err?.error?.errors[0]?.developerMessage || err.message || 'An unknown error occurred.';

                // ** NEW: Check if OTP is expired **
                if (errorMessage.toLowerCase().includes('expired')) {
                    this.alert = {
                        type: 'warning',
                        message: 'Your OTP has expired. A new one has been sent.',
                        position: 'inline'
                    };
                    this.showAlert = true;
                    this.signInForm.get('otp').reset(); // Clear the invalid OTP
                    // Automatically call submitCredentials to resend the OTP
                    this.submitCredentials();
                } else {
                    // Handle other errors like "Invalid OTP"
                    this.alert = {
                        type: 'error',
                        message: errorMessage,
                        position: 'inline'
                    };
                    this.showAlert = true;
                    this.signInForm.enable(); // Re-enable the form for the user to try again
                }
            }
        });
    }

    /**
     * Resends the OTP code to the user. This is for a user-clicked button.
     */
    resendOtp(): void {
        // Prevent user from spamming the resend button
        if (this.resendCooldown > 0) {
            return;
        }
        this.alert = { type: 'info', message: 'Sending a new OTP...', position: 'inline'};
        this.showAlert = true;
        // The logic to resend is the same as submitting credentials initially
        this.submitCredentials();
    }
    
    /**
     * Starts the cooldown timer for resend OTP button.
     */
    private startResendCooldown(): void {
        this.clearResendCooldown(); // Ensure no multiple timers are running
        this.resendCooldown = 60; // 60 seconds cooldown
        this.resendTimer = setInterval(() => {
            this.resendCooldown--;
            if (this.resendCooldown <= 0) {
                clearInterval(this.resendTimer);
            }
        }, 1000);
    }

    /**
     * Clears the resend cooldown timer.
     */
    private clearResendCooldown(): void {
        if (this.resendTimer) {
            clearInterval(this.resendTimer);
            this.resendTimer = null;
        }
        this.resendCooldown = 0;
    }

    getCurrentDate(): string {
        return new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }
    get password() {
        return this.registerForm.get('password');
    }

    get confirmPassword() {
        return this.registerForm.get('confirmPassword');
    }

    /**
     * Resets the UI back to the initial credential state.
     */
    backToCredentials(): void {
        this.loginState = 'credentials';
        this.showAlert = false;
        this.authService.clearTempToken();
        this.signInForm.get('otp').disable();
        this.signInForm.get('otp').reset();
        this.clearResendCooldown(); // Clear cooldown when going back
    }

    /**
     * Handles the registration form submission.
     */
    register(): void {

        if (this.registerForm.invalid) return;

        this.registerForm.disable();
        const { accountType, fullName,email,kraPin,phoneNumber,iraNumber,pinNumber,password,confirmPassword } = this.registerForm.getRawValue();

        const user: CreateUserObject = {
            password: password,
            passwordConfirm: confirmPassword,
            pinNumber: kraPin,
            mobileno: phoneNumber,
            docnumber: iraNumber,
            firstName: fullName,
            email: email,
            clientType: accountType
        }

        console.log(user)

        this.userService.createUser(user).pipe(
            finalize(() => this.registerForm.enable())
        ).subscribe({
            next: () => {
                try {
                    console.log('successful....');
                    this.alert = { type: 'success', message: 'Registration successful! Please sign in.', position: 'bottom' };
                    this.showAlert = true;
                    this.formType = 'login';
                    setTimeout(() => this.showAlert = false, 5000);
                } catch (e) {
                    console.error('Error in success handler:', e);
                }
            },
            error: (err) => {
                console.error('API error:', err?.error);
                this.alert = {
                    type: 'error',
                    message: err?.error?.errors[0].developerMessage || 'Something went wrong.',
                    position: 'inline'
                };
                this.showAlert = true;
                this.registerForm.reset({
                    accountType: accountType,
                    fullName: '',
                    email: '',
                    kraPin: '',
                    phoneNumber: '',
                    iraNumber: '',
                    pinNumber: '',
                    password: '',
                    confirmPassword: ''
                });
            }
        });

    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    ngOnDestroy(): void {
        // Clean up timer when component is destroyed
        this.clearResendCooldown();
    }
}