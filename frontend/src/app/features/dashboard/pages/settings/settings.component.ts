import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { WorkspaceGeneralComponent } from './tabs/workspace-general/workspace-general.component';
import { WorkspaceMembersComponent } from './tabs/workspace-members/workspace-members.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    LucideAngularModule,
    WorkspaceGeneralComponent,
    WorkspaceMembersComponent
  ],
  templateUrl: './settings.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private route = inject(ActivatedRoute);

  activeTab = signal<'general' | 'members'>('general');
  isCreateMode = signal<boolean>(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'create') {
        this.isCreateMode.set(true);
        this.activeTab.set('general');
      } else {
        this.isCreateMode.set(false);
      }
    });
  }

  setTab(tab: 'general' | 'members') {
    this.activeTab.set(tab);
    if (tab === 'members') {
      this.isCreateMode.set(false);
    }
  }
}
