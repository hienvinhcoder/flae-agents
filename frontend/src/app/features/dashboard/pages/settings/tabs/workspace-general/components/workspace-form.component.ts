import { Component, OnInit, effect, inject, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Workspace, CreateManualWorkspacePayload } from '../../../../../../../core/models/workspace.model';
import { ButtonComponent } from '../../../../../../../shared/ui/button.component';

@Component({
  selector: 'app-workspace-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './workspace-form.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class WorkspaceFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  workspace = input<Workspace | null>(null);
  isCreateMode = input<boolean>(false);
  showCancel = input<boolean>(false);
  isSubmitting = input<boolean>(false);

  save = output<CreateManualWorkspacePayload>();
  cancel = output<void>();

  form!: FormGroup;

  constructor() {
    effect(() => {
      const ws = this.workspace();
      const isCreate = this.isCreateMode();
      if (this.form) {
        if (isCreate) {
          this.form.reset({ name: '' });
        } else if (ws) {
          this.form.patchValue({
            name: ws.name
          });
        }
      }
    });
  }

  ngOnInit() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]]
    });

    const ws = this.workspace();
    const isCreate = this.isCreateMode();
    if (!isCreate && ws) {
      this.form.patchValue({
        name: ws.name
      });
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
