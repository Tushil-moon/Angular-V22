/**
 * Rich text editor — ngx-quill wrapper themed for shadcn UI
 */

import { Component, computed, DestroyRef, forwardRef, inject, input, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import type { QuillModules } from 'ngx-quill';
import { sanitizeRichHtml } from '@utils/rich-text.util';

@Component({
    selector: 'app-rich-text-editor',
    imports: [QuillEditorComponent, ReactiveFormsModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => RichTextEditorComponent),
            multi: true,
        },
    ],
    template: `
        <div class="app-rich-text-editor" [class.app-rich-text-editor-disabled]="innerControl.disabled">
            <quill-editor
                class="app-quill-editor"
                theme="snow"
                format="html"
                bounds=".app-rich-text-editor"
                [sanitize]="true"
                [modules]="editorModules"
                [placeholder]="placeholder()"
                [styles]="editorStyles()"
                [formControl]="innerControl"
                (onBlur)="onTouched()"
            />
        </div>
    `,
    styleUrl: './rich-text-editor.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class RichTextEditorComponent implements ControlValueAccessor {
    private readonly destroyRef = inject(DestroyRef);

    placeholder = input('Write your note…');
    minHeight = input('12rem');

    readonly innerControl = new FormControl('', { nonNullable: true });

    readonly editorStyles = computed(() => ({
        minHeight: this.minHeight(),
    }));

    readonly editorModules: QuillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ header: 2 }, { header: 3 }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'link'],
            ['clean'],
        ],
    };

    onTouched: () => void = () => undefined;

    private onChange: (value: string) => void = () => undefined;

    constructor() {
        this.innerControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
            this.onChange(sanitizeRichHtml(value));
        });
    }

    writeValue(value: string | null): void {
        this.innerControl.setValue(sanitizeRichHtml(value ?? ''), { emitEvent: false });
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        if (isDisabled) {
            this.innerControl.disable({ emitEvent: false });
            return;
        }
        this.innerControl.enable({ emitEvent: false });
    }
}
