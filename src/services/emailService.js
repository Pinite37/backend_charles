import nodemailer from 'nodemailer';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import fs from 'fs';
import EmailSent from '../models/EmailSent.js';
import dotenv from 'dotenv';

dotenv.config();

console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASS);



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const formatDate = (dateStr) => {
  // Assuming dateStr is MM/DD/YYYY
  const [month, day, year] = dateStr.split('/');
  const date = new Date(year, month - 1, day);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  return `${dayName} ${day} ${monthName} ${year}`;
};

const emailTemplate = (name, date1, date2) => `
Bonjour ${name},

Merci d'avoir postulé pour le poste d'assistant du service à la clientèle chez Marketing JMA Inc. Nous aimerions vous inviter à un entretien en personne pour discuter plus en détail de vos antécédents et de votre expérience. Cela vous donnera également l'occasion d'en savoir plus sur notre entreprise, notre équipe et le poste.

Détails de l'entretien :

• Options de date et d'heure : Veuillez choisir l'une des options suivantes :

• ${formatDate(date1)}, à 10 h 00

• ${formatDate(date2)}, à 10 h 00

• Emplacement : 4 Rue Georges-Bilodeau, Gatineau, QC, Bureau 105, J8Z 1V2 (2e étage)

• Durée : 10 à 20 minutes

Veuillez confirmer la date et l'heure qui vous conviennent le mieux. Si vous avez des questions ou si vous avez besoin de reprogrammer, n'hésitez pas à nous contacter à : info@jmamarketing.com.

Nous sommes impatients de vous rencontrer.


Hello ${name},

Thank you for applying for the Customer Service Assistant position at Marketing JMA Inc. We would like to invite you to an in-person interview to discuss your background and experience in more detail. This will also give you the opportunity to learn more about our company, our team, and the position.

Interview Details:

• Date and Time Options: Please choose one of the following:

• ${formatDate(date1)}, at 10:00 AM

• ${formatDate(date2)}, at 10:00 AM

• Location: 4 Rue Georges-Bilodeau, Gatineau, QC, Office 105, J8Z 1V2 (2nd floor)

• Duration: 10 to 20 minutes

Please confirm the date and time that works best for you. If you have any questions or need to reschedule, feel free to contact us at: info@jmamarketing.com.

We look forward to meeting you.
`;

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const parseXLSX = (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

const sendEmails = async (data, io) => {
  console.log(`Starting to send emails to ${data.length} recipients`);
  const total = data.length;
  let sent = 0;
  for (const row of data) {
    const email = row.Email;
    const name = row['Nom et Prenoms'];
    const date1 = row.Date;
    const date2 = row.Date2 || row['Date 2'];
    if (!email || !name || !date1 || !date2) {
      console.log(`Skipping row: missing email, name, or dates - Email: ${email}, Name: ${name}, Date1: ${date1}, Date2: ${date2}`);
      continue;
    }

    try {
      console.log(`Sending email to ${name} at ${email}`);
      await transporter.sendMail({
        from: {
          name: 'Marketing JMA Inc.',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'INVITATION FOR INTERVIEW / INVITATION POUR ENTREVUE',
        text: emailTemplate(name, date1, date2)
      });
      await EmailSent.create({ name, email });
      sent++;
      console.log(`Email sent successfully to ${name} (${sent}/${total})`);
      io.emit('progress', { sent, total });
    } catch (error) {
      console.error(`Failed to send email to ${name} at ${email}: ${error.message}`);
      await EmailSent.create({ name, email, status: 'failed', error: error.message });
    }
  }
  console.log(`Email sending completed: ${sent}/${total} emails sent successfully`);
  io.emit('done', { sent, total });
  return { sent, total };
};

export { parseCSV, parseXLSX, sendEmails };