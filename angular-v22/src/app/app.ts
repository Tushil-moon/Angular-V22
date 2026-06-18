import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToasterComponent } from '@shared/components/toaster.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToasterComponent],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    protected readonly title = signal('angular-v22');
}
