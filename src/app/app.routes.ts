// src/app/app.routes.ts

import { Route } from "@angular/router";
import { initialDataResolver } from "app/app.resolvers";
import { AuthGuard } from "app/core/auth/guards/auth.guard";
import { NoAuthGuard } from "app/core/auth/guards/noAuth.guard";
import { LayoutComponent } from "app/layout/layout.component";

export const appRoutes: Route[] = [
	{
		path: "",
		pathMatch: "full",
		redirectTo: "home"
	},
	{ path: "signed-in-redirect", pathMatch: "full", redirectTo: "dashboard" },

	// --- Auth routes for GUESTS ---
	{
		path: "",
		canActivate: [NoAuthGuard],
		canActivateChild: [NoAuthGuard],
		component: LayoutComponent,
		data: {
			layout: "empty",
		},
		children: [
			{
				path: "confirmation-required",
				loadChildren: () => import("app/modules/auth/confirmation-required/confirmation-required.routes"),
			},
			{
				path: "forgot-password",
				loadChildren: () => import("app/modules/auth/forgot-password/forgot-password.routes"),
			},
			{
				path: "reset-password",
				loadChildren: () => import("app/modules/auth/reset-password/reset-password.routes"),
			},
			{
				path: "home",
				loadChildren: () => import("app/modules/auth/sign-in/sign-in.routes"),
			},
			{
				path: "sign-in",
				loadChildren: () => import("app/modules/auth/sign-in/sign-in.routes"),
			},

            // --- FIX IS HERE: Create a dedicated parent route for sign-up and quote forms ---
            {
                path: 'sign-up',
                children: [
                    // Dashboard route added here to match 'sign-up/dashboard'
                    {
                        path: 'dashboard',
                        loadChildren: () => import('app/modules/auth/dashboard/dashboard.routes'),
                    },
                    // You will create this component later for the actual sign-up form
                    // {
                    //     path: '', // This will match '/sign-up'
                    //     loadChildren: () => import('app/modules/auth/sign-up/sign-up.routes'),
                    // },
					// in app.routes.ts, inside the 'sign-up' children array

					{
						path: 'travel-quote',
						loadChildren: () => import('app/modules/auth/travel-quote/travel-quote.routes'),
					},
                    {
                        path: 'marine-quote', // This will correctly match '/sign-up/marine-quote'
                        loadChildren: () => import('app/modules/auth/marine-cargo-quotation/marine-cargo-quotation.routes'),
                    },
                ]
            }
            // --- END OF FIX ---
		],
	},

	// --- Routes for AUTHENTICATED USERS ---
	{
		path: "",
		canActivate: [AuthGuard],
		canActivateChild: [AuthGuard],
		component: LayoutComponent,
		data: {
			layout: "empty",
		},
		children: [
            {
                path: 'dashboard',
                loadChildren: () => import('app/modules/auth/dashboard/dashboard.routes'),
            },
			{
				path: "sign-out",
				loadChildren: () => import("app/modules/auth/sign-out/sign-out.routes"),
			},
			{
				path: "unlock-session",
				loadChildren: () => import("app/modules/auth/unlock-session/unlock-session.routes"),
			},
            {
                path: 'travel-quote',
                loadChildren: () => import('app/modules/auth/travel-quote/travel-quote.routes'),
            },
            {
                path: 'marine-quote', // This will correctly match '/sign-up/marine-quote'
                loadChildren: () => import('app/modules/auth/marine-cargo-quotation/marine-cargo-quotation.routes'),
            },
		],
	},

	// --- Admin routes (Retained for future use) ---
	{
		path: "",
		canActivate: [AuthGuard],
		canActivateChild: [AuthGuard],
		component: LayoutComponent,
		resolve: {
			initialData: initialDataResolver,
		},
		children: [
			{
				path: "example",
				loadChildren: () => import("app/modules/admin/example/example.routes"),
			},
		],
	},
];
