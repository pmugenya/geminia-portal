import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface Feature {
  title: string;
  description: string;
  icon: string;
  borderColor: string;
}

interface Stat {
  value: string;
  label: string;
}

@Component({
  selector: 'app-marine-guard-pro',
  templateUrl: './marine-guard-pro.component.html',
  styleUrls: ['./marine-guard-pro.component.css'],
})
export class MarineGuardProComponent {
  features: Feature[] = [
    {
      title: 'UCR & IDF Compliance',
      description: 'Real-time validation with KRA systems for seamless customs clearance',
      icon: 'shield',
      borderColor: 'border-l-blue-500'
    },
    {
      title: 'Instant Certificates',
      description: 'Generate marine cargo certificates and policy documents instantly',
      icon: 'document',
      borderColor: 'border-l-green-500'
    },
    {
      title: 'Multi-User Portal',
      description: 'Designed for intermediaries, clearing agents, and individual importers',
      icon: 'users',
      borderColor: 'border-l-purple-500'
    },
  ];

  stats: Stat[] = [
    { value: '24/7', label: 'Support Available' },
    { value: '5000+', label: 'Policies Issued' },
    { value: '99.9%', label: 'Uptime Guarantee' },
    { value: 'KRA', label: 'Integrated' },
  ];

  constructor(private router: Router) {}

  onAccessPortal(): void {
    // Navigate to portal or handle access
    console.log('Access Portal clicked');
  }

  onGetQuote(): void {
    // Navigate to quote page or open quote modal
    console.log('Get Quick Quote clicked');
  }
}