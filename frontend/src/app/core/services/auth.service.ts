import { Injectable, inject } from '@angular/core';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithRedirect, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
  UserCredential
} from '@angular/fire/auth';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);

  signInWithEmail(email: string, password: string): Observable<UserCredential> {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  registerWithEmail(email: string, password: string): Observable<UserCredential> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  /**
   * Google Sign-In sử dụng signInWithPopup thay vì signInWithRedirect.
   * Lý do: signInWithRedirect gặp lỗi Third-Party Storage Partitioning trên localhost
   * khiến Firebase SDK không thể khôi phục session đăng nhập sau khi redirect quay lại.
   * signInWithPopup mở cửa sổ phụ và truyền kết quả trực tiếp qua postMessage,
   * hoạt động ổn định trên cả localhost và môi trường production.
   */
  signInWithGoogle(): Observable<UserCredential> {
    const provider = new GoogleAuthProvider();
    return from(signInWithPopup(this.auth, provider));
  }

  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  getFirebaseToken(user: FirebaseUser): Observable<string> {
    return from(user.getIdToken(true));
  }
  
  getCurrentFirebaseUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }
}
