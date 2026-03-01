import Mailjet from 'node-mailjet';

const mailjet = Mailjet.apiConnect(
  process.env.MJ_APIKEY_PUBLIC || '',
  process.env.MJ_APIKEY_PRIVATE || ''
);

interface EmailOptions {
  to: string;
  toName: string;
  subject: string;
  textPart: string;
  htmlPart: string;
}

/**
 * Send email using Mailjet
 */
export const sendMail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAIL_FROM_EMAIL,
              Name: process.env.MAIL_FROM_NAME || 'Faculty Appraisal System',
            },
            To: [
              {
                Email: options.to,
                Name: options.toName,
              },
            ],
            Subject: options.subject,
            TextPart: options.textPart,
            HTMLPart: options.htmlPart,
          },
        ],
      });

    const result = await request;
    // console.log('Email sent successfully:', result.body);
    return true;
  } catch (error: any) {
    console.error('Email sending failed:', error.statusCode || error.message);
    return false;
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const htmlPart = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Dear ${name},</p>
      <p>You have requested to reset your password for the Faculty Appraisal System.</p>
      <p>Please click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${resetUrl}</p>
      <p><strong>This link will expire in 1 hour.</strong></p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">This is an automated email, please do not reply.</p>
    </div>
  `;

  const textPart = `
    Dear ${name},

    You have requested to reset your password for the Faculty Appraisal System.
    
    Please visit the following link to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you did not request a password reset, please ignore this email.
  `;

  return sendMail({
    to: email,
    toName: name,
    subject: 'Password Reset Request - Faculty Appraisal System',
    textPart: textPart,
    htmlPart: htmlPart,
  });
};
