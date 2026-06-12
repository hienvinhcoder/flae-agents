import { Component, OnInit, inject, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WorkspaceRole } from '../../../../../../core/models/workspace.model';
import { ButtonComponent } from '../../../../../../shared/ui/button.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-invite-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, LucideAngularModule],
  templateUrl: './invite-modal.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class InviteModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  isOpen = input.required<boolean>();
  isSubmitting = input<boolean>(false);

  close = output<void>();
  invited = output<{ email: string; role: WorkspaceRole }>();

  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['member' as WorkspaceRole, [Validators.required]]
    });
  }

  onClose() {
    this.form.reset({
      email: '',
      role: 'member'
    });
    this.close.emit();
  }

  onSubmit() {
    if (this.form.valid) {
      this.invited.emit(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
