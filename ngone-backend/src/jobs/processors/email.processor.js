import { sendEmail } from '../../config/ses.js';
import logger from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, '..', '..', 'templates', 'emails');

function loadTemplate(name) {
  try {
    return fs.readFileSync(path.join(templatesDir, `${name}.html`), 'utf-8');
  } catch {
    logger.warn(`Email template not found: ${name}.html — using fallback`);
    return null;
  }
}

function renderTemplate(html, data) {
  if (!html) return `<p>${JSON.stringify(data)}</p>`;
  let rendered = html;
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
  }
  return rendered;
}

function generatePDFReceipt(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).fillColor('#FF6B35').text('NG😊NE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#333').text('80G Tax Receipt', { align: 'center' });
    doc.moveDown(1);

    // Receipt details
    doc.fontSize(11).fillColor('#555');
    doc.text(`Receipt No: ${data.receiptNo}`);
    doc.text(`Date: ${data.date}`);
    doc.moveDown(0.5);

    doc.text(`Donor Name: ${data.name}`);
    doc.text(`PAN: ${data.pan}`);
    doc.moveDown(0.5);

    doc.fontSize(16).fillColor('#FF6B35').text(`Amount: ₹${data.amount.toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#777');
    doc.text('This receipt is issued under Section 80G of the Income Tax Act, 1961.', { align: 'center' });
    doc.text('Donations to NGone Foundation are eligible for 50% tax deduction.', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(9).fillColor('#999');
    doc.text('NGone Foundation | DARPAN ID: DL/2015/0098765 | 80G Reg: AAAPL1234C', { align: 'center' });

    doc.end();
  });
}

/**
 * Process email jobs from Bull queue
 */
export default function processEmailJobs(emailQueue) {
  emailQueue.process(async (job) => {
    const { type, to, data } = job.data.to ? job.data : { type: job.name, ...job.data };

    logger.info(`Processing email job: ${type || job.name} → ${to}`);

    let subject, html, attachments;

    switch (type || job.name) {
      case 'welcome': {
        subject = 'Welcome to NGone 😊 — Let\'s Change India Together';
        const template = loadTemplate('welcome');
        html = renderTemplate(template, data) ||
          `<h1>Welcome to NGone, ${data.name}! 😊</h1>
           <p>You've joined as a <strong>${data.role}</strong>.</p>
           <p><a href="${data.loginUrl}" style="background:#FF6B35;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Login Now</a></p>`;
        break;
      }

      case 'otp_email': {
        subject = `Your NGone OTP: ${data.otp}`;
        const template = loadTemplate('otp');
        html = renderTemplate(template, data) ||
          `<h2>Hi ${data.name},</h2>
           <p>Your OTP is: <strong style="font-size:24px;color:#FF6B35;">${data.otp}</strong></p>
           <p>Valid for ${data.expiresInMinutes} minutes. Do not share this code.</p>`;
        break;
      }

      case 'donation_receipt': {
        subject = `Thank you for your donation ₹${data.amount} — NGone`;
        const template = loadTemplate('donation-receipt');
        html = renderTemplate(template, data) ||
          `<h2>Thank you, ${data.name}! 💚</h2>
           <p>Your donation of <strong>₹${data.amount}</strong> to <strong>${data.ngoName}</strong> has been received.</p>
           <p>Transaction ID: ${data.transactionId}</p>
           <p>Date: ${data.date}</p>`;
        break;
      }

      case 'tax_receipt_80g': {
        subject = '80G Tax Receipt — NGone Foundation';
        const template = loadTemplate('tax-receipt-80g');
        html = renderTemplate(template, data) ||
          `<h2>80G Tax Receipt</h2>
           <p>Dear ${data.name}, please find your 80G tax receipt attached.</p>
           <p>Receipt No: ${data.receiptNo}</p>
           <p>Amount: ₹${data.amount}</p>`;

        // Generate PDF
        const pdfBuffer = await generatePDFReceipt(data);
        attachments = [{
          filename: `80G_Receipt_${data.receiptNo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }];
        break;
      }

      case 'team_invite': {
        subject = 'You\'ve been invited to join a volunteer team!';
        const template = loadTemplate('team-invite');
        html = renderTemplate(template, data) ||
          `<h2>Hi ${data.inviteeName}! 👥</h2>
           <p><strong>${data.senderName}</strong> invited you to join the team for <strong>${data.taskName}</strong>.</p>
           <p><a href="${data.acceptUrl}" style="background:#FF6B35;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">View Invite</a></p>`;
        break;
      }

      case 'password_reset': {
        subject = 'Reset your NGone password';
        const template = loadTemplate('password-reset');
        html = renderTemplate(template, data) ||
          `<h2>Hi ${data.name},</h2>
           <p>Click below to reset your password. This link expires in ${data.expiresIn}.</p>
           <p><a href="${data.resetUrl}" style="background:#FF6B35;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset Password</a></p>`;
        break;
      }

      case 'crisis_alert': {
        subject = `🆘 Urgent: Volunteers needed — ${data.crisisTitle}`;
        const template = loadTemplate('crisis-alert');
        html = renderTemplate(template, data) ||
          `<h2>🆘 Crisis Alert</h2>
           <p>Hi ${data.name}, volunteers are urgently needed for <strong>${data.crisisTitle}</strong>.</p>
           <p>Location: ${data.location} | Urgency: ${data.urgency} | Distance: ${data.distance} km</p>`;
        break;
      }

      case 'weekly_report': {
        subject = 'Your weekly impact — NGone';
        const template = loadTemplate('weekly-report');
        html = renderTemplate(template, data) ||
          `<h2>Hi ${data.name}, here's your weekly summary 📊</h2>
           <p>Tasks: ${data.tasksThisWeek} | Hours: ${data.hoursLogged} | Points: ${data.pointsEarned}</p>`;
        break;
      }

      default:
        logger.warn(`Unknown email job type: ${type || job.name}`);
        return;
    }

    await sendEmail({ to, subject, html, attachments });
    logger.info(`Email sent: ${type || job.name} → ${to}`);
  });

  logger.info('✅ Email processor registered');
}
