import nodemailer from 'nodemailer';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import fs from 'fs';
import EmailSent from '../models/EmailSent.js';
import dotenv from 'dotenv';

dotenv.config();

console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASS);



const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 60000,     // 60 seconds
  pool: true,               // Utiliser un pool de connexions pour réutiliser la connexion SMTP
  maxConnections: 5,        // Maximum 5 connexions simultanées
  maxMessages: 100          // Envoyer jusqu'à 100 messages par connexion avant de la réinitialiser
});

const formatDate = (dateStr) => {
  if (!dateStr) return 'Date non spécifiée';
  
  let date;
  
  // Si c'est un nombre (format Excel serial date)
  if (typeof dateStr === 'number') {
    // Excel dates start from 1900-01-01
    const excelEpoch = new Date(1899, 11, 30);
    date = new Date(excelEpoch.getTime() + dateStr * 86400000);
  } 
  // Si c'est déjà un objet Date
  else if (dateStr instanceof Date) {
    date = dateStr;
  }
  // Si c'est une chaîne de caractères
  else if (typeof dateStr === 'string') {
    // Format MM/DD/YYYY ou M/D/YYYY
    if (dateStr.includes('/')) {
      const [month, day, year] = dateStr.split('/');
      date = new Date(year, month - 1, day);
    } else {
      // Essayer de parser directement
      date = new Date(dateStr);
    }
  } else {
    return 'Date invalide';
  }
  
  // Vérifier que la date est valide
  if (isNaN(date.getTime())) {
    return 'Date invalide';
  }
  
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
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
  let failed = 0;
  
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
      io.emit('progress', { sent, total, failed });
    } catch (error) {
      console.error(`Failed to send email to ${name} at ${email}: ${error.message}`);
      await EmailSent.create({ name, email, status: 'failed', error: error.message });
      failed++;
      io.emit('progress', { sent, total, failed });
    }
  }
  
  console.log(`Email sending completed: ${sent}/${total} emails sent successfully, ${failed} failed`);
  io.emit('done', { sent, total, failed });
  
  return { sent, total, failed };
};

export { parseCSV, parseXLSX, sendEmails };