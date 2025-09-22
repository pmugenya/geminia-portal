import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ShareModalData {
    quoteText: string;
    shareLink: string;
    quoteId: string;
}

@Component({
    selector: 'app-share-modal',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
    template: `
        <div class="share-modal-container">
            <div class="modal-header">
                <div class="header-icon-wrapper">
                    <mat-icon>share</mat-icon>
                </div>
                <div class="header-text-content">
                    <h1 mat-dialog-title class="modal-title">Share Quote</h1>
                    <p class="modal-subtitle">Share your marine cargo insurance quote</p>
                </div>
                <button mat-icon-button (click)="closeDialog()" class="close-button" aria-label="Close dialog">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <mat-dialog-content class="modal-content">
                <!-- Social Media Share Options -->
                <div class="share-options">
                    <h3 class="section-title">Share via</h3>
                    <div class="share-buttons-grid">
                        <button (click)="shareViaWhatsApp()" class="share-button whatsapp">
                            <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                            </svg>
                            <span>WhatsApp</span>
                        </button>

                        <button (click)="shareViaEmail()" class="share-button email">
                            <mat-icon class="share-icon">email</mat-icon>
                            <span>Email</span>
                        </button>

                        <button (click)="shareViaSMS()" class="share-button sms">
                            <mat-icon class="share-icon">sms</mat-icon>
                            <span>SMS</span>
                        </button>

                        <button (click)="copyQuoteText()" class="share-button copy"
                                [class.copied]="textCopied"
                                matTooltip="Copy quote details">
                            <mat-icon class="share-icon">{{ textCopied ? 'check' : 'content_copy' }}</mat-icon>
                            <span>{{ textCopied ? 'Copied!' : 'Copy Text' }}</span>
                        </button>
                    </div>
                </div>

                <!-- Share Link Section -->
                <div class="share-link-section">
                    <h3 class="section-title">Or copy link</h3>
                    <div class="link-container">
                        <input
                            #linkInput
                            type="text"
                            [value]="data.shareLink"
                            readonly
                            class="link-input"
                        />
                        <button (click)="copyShareLink()"
                                class="copy-link-btn"
                                [class.copied]="linkCopied"
                                matTooltip="Copy share link">
                            <mat-icon>{{ linkCopied ? 'check' : 'content_copy' }}</mat-icon>
                        </button>
                    </div>
                </div>

                <!-- Preview Section -->
                <div class="preview-section">
                    <h3 class="section-title">Preview</h3>
                    <div class="quote-preview">
                        <pre>{{ getPreviewText() }}</pre>
                    </div>
                </div>
            </mat-dialog-content>
        </div>
    `,
    styles: [`
        .share-modal-container {
            border-radius: 16px;
            overflow: hidden;
            max-width: 500px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
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
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
        }

        .header-text-content {
            flex-grow: 1;
        }

        .modal-title {
            color: white;
            font-size: 20px;
            font-weight: 600;
            margin: 0;
        }

        .modal-subtitle {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 2px;
        }

        .close-button {
            position: absolute;
            top: 12px;
            right: 12px;
            color: rgba(255, 255, 255, 0.7);
        }

        .modal-content {
            padding: 24px !important;
            background-color: #f9fafb;
        }

        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 16px;
        }

        .share-options {
            margin-bottom: 32px;
        }

        .share-buttons-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .share-button {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px 12px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            background: white;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #374151;
            font-size: 14px;
            font-weight: 500;
        }

        .share-button:hover {
            border-color: #04b2e1;
            background-color: #f0f9ff;
            color: #04b2e1;
            transform: translateY(-2px);
        }

        .share-button.copied {
            border-color: #10b981;
            background-color: #ecfdf5;
            color: #10b981;
        }

        .share-button.whatsapp:hover {
            border-color: #25d366;
            background-color: #f0fdf4;
            color: #25d366;
        }

        .share-button.email:hover {
            border-color: #dc2626;
            background-color: #fef2f2;
            color: #dc2626;
        }

        .share-button.sms:hover {
            border-color: #7c3aed;
            background-color: #faf5ff;
            color: #7c3aed;
        }

        .share-icon {
            width: 24px;
            height: 24px;
            margin-bottom: 8px;
        }

        .share-link-section {
            margin-bottom: 24px;
        }

        .link-container {
            display: flex;
            align-items: center;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            overflow: hidden;
        }

        .link-input {
            flex: 1;
            padding: 12px 16px;
            border: none;
            outline: none;
            font-size: 14px;
            background: transparent;
        }

        .copy-link-btn {
            padding: 12px 16px;
            border: none;
            background: #f9fafb;
            border-left: 1px solid #e5e7eb;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #6b7280;
        }

        .copy-link-btn:hover {
            background: #04b2e1;
            color: white;
        }

        .copy-link-btn.copied {
            background: #10b981;
            color: white;
        }

        .preview-section {
            margin-top: 24px;
        }

        .quote-preview {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            max-height: 200px;
            overflow-y: auto;
        }

        .quote-preview pre {
            margin: 0;
            font-size: 12px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: #374151;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        @media (max-width: 480px) {
            .share-buttons-grid {
                grid-template-columns: 1fr;
            }

            .modal-header {
                padding: 16px;
            }

            .modal-content {
                padding: 16px !important;
            }

            .header-text-content {
                padding-right: 40px;
            }
        }
    `]
})
export class ShareModalComponent {
    textCopied = false;
    linkCopied = false;

    constructor(
        public dialogRef: MatDialogRef<ShareModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ShareModalData
    ) {}

    closeDialog(result?: string): void {
        this.dialogRef.close(result);
    }

    shareViaWhatsApp(): void {
        const text = encodeURIComponent(this.data.quoteText);
        const whatsappUrl = `https://wa.me/?text=${text}`;
        window.open(whatsappUrl, '_blank');
    }

    shareViaEmail(): void {
        const subject = encodeURIComponent('Marine Cargo Insurance Quote - Geminia');
        const body = encodeURIComponent(this.data.quoteText);
        const emailUrl = `mailto:?subject=${subject}&body=${body}`;
        window.location.href = emailUrl;
    }

    shareViaSMS(): void {
        const text = encodeURIComponent(this.data.quoteText.substring(0, 160) + '...');
        const smsUrl = `sms:?body=${text}`;
        window.location.href = smsUrl;
    }

    copyQuoteText(): void {
        this.copyToClipboard(this.data.quoteText).then(() => {
            this.textCopied = true;
            setTimeout(() => {
                this.textCopied = false;
            }, 2000);
            this.closeDialog('copied');
        });
    }

    copyShareLink(): void {
        this.copyToClipboard(this.data.shareLink).then(() => {
            this.linkCopied = true;
            setTimeout(() => {
                this.linkCopied = false;
            }, 2000);
            this.closeDialog('link-copied');
        });
    }

    private async copyToClipboard(text: string): Promise<void> {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                this.fallbackCopyTextToClipboard(text);
            }
        } catch (err) {
            this.fallbackCopyTextToClipboard(text);
        }
    }

    private fallbackCopyTextToClipboard(text: string): void {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }

        document.body.removeChild(textArea);
    }

    getPreviewText(): string {
        return this.data.quoteText.split('\n').slice(0, 10).join('\n') +
               (this.data.quoteText.split('\n').length > 10 ? '\n...' : '');
    }
}