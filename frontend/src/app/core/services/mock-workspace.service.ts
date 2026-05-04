import { Injectable, signal } from '@angular/core';

export interface MockWorkspace {
  id: string;
  name: string;
  industry: string;
}

export interface MockInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  role: 'Admin' | 'Member';
  status: 'pending' | 'accepted' | 'declined';
}

@Injectable({
  providedIn: 'root'
})
export class MockWorkspaceService {
  readonly currentWorkspace = signal<MockWorkspace | null>(null);
  readonly pendingInvitation = signal<MockInvitation | null>({
    id: 'invite-123',
    workspaceId: 'ws-456',
    workspaceName: 'Acme Corp',
    role: 'Admin',
    status: 'pending'
  }); // Giả lập có sẵn 1 lời mời cho tài khoản invitee@mock.com
  
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {}

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async createWorkspace(name: string, industry: string) {
    this.isLoading.set(true);
    this.error.set(null);

    await this.delay(1000);

    try {
      if (!name || !industry) {
        throw new Error('Vui lòng điền đầy đủ thông tin.');
      }

      const newWorkspace: MockWorkspace = {
        id: `ws-${Date.now()}`,
        name,
        industry
      };
      
      this.currentWorkspace.set(newWorkspace);
    } catch (e: any) {
      this.error.set(e.message || 'Tạo workspace thất bại.');
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  async acceptInvitation(invitationId: string) {
    this.isLoading.set(true);
    this.error.set(null);

    await this.delay(800);

    try {
      const invite = this.pendingInvitation();
      if (!invite || invite.id !== invitationId) {
        throw new Error('Lời mời không hợp lệ hoặc đã hết hạn.');
      }

      // Mô phỏng join thành công
      this.currentWorkspace.set({
        id: invite.workspaceId,
        name: invite.workspaceName,
        industry: 'Unknown'
      });
      
      this.pendingInvitation.set(null);
    } catch (e: any) {
      this.error.set(e.message || 'Có lỗi xảy ra khi chấp nhận lời mời.');
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }
}
