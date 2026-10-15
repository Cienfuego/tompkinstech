import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-1' });

export async function sendAlert(subject, body) {
  const to = process.env.ALERT_EMAIL_TO;
  const from = process.env.ALERT_EMAIL_FROM;
  if (!to || !from) {
    console.warn('ALERT_EMAIL_TO / ALERT_EMAIL_FROM not set — skipping alert email:', subject);
    return;
  }

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: body } } } }
    })
  );
}
