import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  async sendPasswordResetEmail() {
    // Email flow disabled for anonymous-only release.
    return { skipped: true };
  }
}
