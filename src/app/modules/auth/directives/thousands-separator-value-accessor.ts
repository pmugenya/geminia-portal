import { Directive, ElementRef, forwardRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
    selector: 'input[appThousands]',
    standalone: true,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ThousandsSeparatorValueAccessor),
            multi: true
        }
    ]
})
export class ThousandsSeparatorValueAccessor implements ControlValueAccessor {
    private onChange: (value: number | null) => void = () => {};
    private onTouched: () => void = () => {};
    private lastFormatted = '';

    constructor(private el: ElementRef<HTMLInputElement>) {}

    writeValue(value: number | string | null): void {
        const input = this.el.nativeElement;
        if (value === null || value === undefined || value === '') {
            input.value = '';
            this.lastFormatted = '';
            return;
        }
        const num = typeof value === 'number' ? value : +String(value).replace(/\D/g, '');
        const formatted = this.format(num);
        input.value = formatted;
        this.lastFormatted = formatted;
    }

    registerOnChange(fn: any): void { this.onChange = fn; }
    registerOnTouched(fn: any): void { this.onTouched = fn; }
    setDisabledState(isDisabled: boolean): void { this.el.nativeElement.disabled = isDisabled; }

    @HostListener('input', ['$event'])
    handleInput(e: Event) {
        const input = e.target as HTMLInputElement;

        // raw digits -> numeric
        const raw = input.value.replace(/\D/g, '');
        const numeric = raw ? +raw : null;

        // emit clean numeric to the form
        this.onChange(numeric);

        // format for display
        const formatted = raw ? this.format(+raw) : '';
        input.value = formatted;
        this.lastFormatted = formatted;
    }

    @HostListener('blur')
    handleBlur() { this.onTouched(); }

    private format(n: number): string {
        // 1,234,567 (no decimals). Swap to Intl if you prefer locale formatting.
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}
