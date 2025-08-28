// src/app/modules/auth/dashboard/dashboard.routes.ts

import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

// The path is '' because the parent route in app.routes.ts will provide the 'dashboard' segment.
export default [
    {
        path     : '',
        component: DashboardComponent,
    },
] as Routes;