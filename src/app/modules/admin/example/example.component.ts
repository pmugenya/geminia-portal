import { Component, ViewEncapsulation } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';


@Component({
    selector: 'example',
    standalone: true,
    templateUrl: './example.component.html',
    encapsulation: ViewEncapsulation.None,
    imports: [
        FullCalendarModule,
        MatDialogModule
    ],
})

export class ExampleComponent
{


    constructor(private dialog: MatDialog) {}


}
