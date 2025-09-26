import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ShareModalData {
    quoteText: string;
    shareLink: string; // Kept in interface for compatibility, but not used in this modal
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
                <!-- Specific Share Options -->
                <div class="share-options">
                    <h3 class="section-title">Share via</h3>
                    <div class="share-buttons-grid">
                        <!-- WhatsApp Button -->
                        <button (click)="shareViaWhatsApp()" class="share-button whatsapp" matTooltip="Share via WhatsApp">
                            <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                            </svg>
                            <span>WhatsApp</span>
                        </button>

                        <!-- Gmail Button -->
                        <button (click)="shareViaGmail()" class="share-button gmail" matTooltip="Share via Gmail">
                             <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22 5.88V18c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-.55.22-1.05.59-1.41L12 12l9.41-7.41C21.78 4.95 22 5.45 22 6v-.12zM12 10.5L3.5 4.25h17L12 10.5z"/>
                            </svg>
                            <span>Gmail</span>
                        </button>

                        <!-- Outlook Button -->
                        <button (click)="shareViaOutlook()" class="share-button outlook" matTooltip="Share via Outlook">
                            <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21 5H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-2 12H5V9.92l7 4.38 7-4.38V17zM12 12.5L5 8h14l-7 4.5z"/>
                            </svg>
                            <span>Outlook</span>
                        </button>

                        <!-- Yahoo Mail Button -->
                        <button (click)="shareViaYahoo()" class="share-button yahoo" matTooltip="Share via Yahoo Mail">
                            <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-3.92 7.28h-3.296l3.92-7.28-3.92-7.28h3.296l2.272 4.224L16.192.88h3.296l-3.92 7.28z"/>
                            </svg>
                            <span>Yahoo</span>
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
        /* ... all the modal container, header, and content styles remain the same ... */
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
            text-align: center;
        }

        .share-options {
            margin-bottom: 24px;
        }

        .share-buttons-grid {
            display: grid;
            /* Updated to fit 4 items gracefully */
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .share-button {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 16px 12px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            background: white;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #374151;
            font-size: 14px;
            font-weight: 500;
            text-align: center;
        }

        .share-button:hover {
            transform: translateY(-2px);
        }

        .share-button.whatsapp:hover {
            border-color: #25d366;
            background-color: #f0fdf4;
            color: #25d366;
        }

        /* NEW STYLES for Gmail and Outlook */
        .share-button.gmail:hover {
            border-color: #EA4335;
            background-color: #fef2f2;
            color: #EA4335;
        }

        .share-button.outlook:hover {
            border-color: #0078D4;
            background-color: #f0f9ff;
            color: #0078D4;
        }

        .share-button.yahoo:hover {
            border-color: #720e9e;
            background-color: #faf5ff;
            color: #720e9e;
        }

        .share-icon {
            width: 28px;
            height: 28px;
            margin-bottom: 8px;
        }

        .preview-section {
            margin-top: 24px;
        }

        .quote-preview {
            background: linear-gradient(135deg, #04b2e1 0%, #0396c7 100%);
            border: none;
            border-radius: 12px;
            padding: 20px;
            max-height: 200px;
            overflow-y: auto;
            box-shadow: 0 4px 15px rgba(4, 178, 225, 0.2);
        }

        .quote-preview pre {
            margin: 0;
            font-size: 13px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: 500;
        }

        @media (max-width: 480px) {
            .share-buttons-grid {
                /* Stack them on small screens */
                grid-template-columns: 1fr;
            }
        }

        @media (min-width: 481px) and (max-width: 640px) {
            .share-buttons-grid {
                /* 2x2 grid on medium screens */
                grid-template-columns: repeat(2, 1fr);
            }
        }
    `]
})
export class ShareModalComponent {

    constructor(
        public dialogRef: MatDialogRef<ShareModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ShareModalData
    ) {}

    closeDialog(): void {
        this.dialogRef.close();
    }

    shareViaWhatsApp(): void {
        // Ensure the full text is shared on WhatsApp
        const text = encodeURIComponent(this.data.quoteText);
        const whatsappUrl = `https://wa.me/?text=${text}`;
        window.open(whatsappUrl, '_blank');
        this.closeDialog();
    }

    shareViaGmail(): void {
        const subject = encodeURIComponent('Marine Cargo Insurance Quote - Geminia');
        // Share only the quote text without website URL
        const body = encodeURIComponent(this.data.quoteText);

        // This URL structure opens a new compose window in Gmail
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
        this.closeDialog();
    }

    shareViaOutlook(): void {
        const subject = encodeURIComponent('Marine Cargo Insurance Quote - Geminia');
        // Share only the quote text without website URL
        // The body for Outlook needs URL-encoded line breaks (%0D%0A)
        const body = encodeURIComponent(this.data.quoteText).replace(/%0A/g, '%0D%0A');

        // This URL structure opens a new compose window in Outlook
        const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`;
        window.open(outlookUrl, '_blank');
        this.closeDialog();
    }

    shareViaYahoo(): void {
        const subject = encodeURIComponent('Marine Cargo Insurance Quote - Geminia');
        // Share only the quote text without website URL
        const body = encodeURIComponent(this.data.quoteText);

        // Updated URL structure for Yahoo Mail compose - using the correct format
        const yahooUrl = `https://compose.mail.yahoo.com/?To=&Subject=${subject}&Body=${body}`;
        window.open(yahooUrl, '_blank');
        this.closeDialog();
    }

    getPreviewText(): string {
        // Extract only premium breakdown and total payable for modern preview
        const lines = this.data.quoteText.split('\n');
        
        // Find the premium breakdown section
        const premiumStartIndex = lines.findIndex(line => line.includes('Premium Breakdown:'));
        const totalPayableIndex = lines.findIndex(line => line.includes('TOTAL PAYABLE:'));
        
        if (premiumStartIndex === -1 || totalPayableIndex === -1) {
            // Fallback to basic preview if structure is different
            return `Marine Cargo Insurance Quote\n\nPremium Details Available\nComplete quote information will be shared`;
        }
        
        // Create modern preview with only premium breakdown and total
        const premiumLines = lines.slice(premiumStartIndex, totalPayableIndex + 1);
        
        return `Marine Cargo Insurance Quote - Geminia\n\n${premiumLines.join('\n')}\n\nComplete details will be shared via your selected method`;
    }
}