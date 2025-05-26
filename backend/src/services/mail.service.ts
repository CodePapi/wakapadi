// mail.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  async sendPasswordReset(email: string, resetUrl: string) {
    // In production, integrate with SendGrid/Mailgun/etc.
    console.log(`Password reset link for ${email}: ${resetUrl}`);
    return true;
  }
}