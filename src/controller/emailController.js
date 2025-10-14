import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parseCSV, parseXLSX, sendEmails } from '../services/emailService.js';

const upload = multer({ dest: 'uploads/' });

const sendInvitations = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(file.originalname).toLowerCase();
  let data;
  try {
    if (ext === '.csv') {
      data = await parseCSV(file.path);
    } else if (ext === '.xlsx') {
      data = parseXLSX(file.path);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Filter data to only those with email
    data = data.filter(row => row.Email && row.Email.trim());

    // Send emails asynchronously and wait for completion
    await sendEmails(data, req.io);

    // Delete the uploaded file after processing
    fs.unlink(file.path, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    res.json({ message: 'Emails sent successfully', total: data.length });
  } catch (error) {
    // Also delete file on error
    fs.unlink(file.path, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
    res.status(500).json({ error: error.message });
  }
};

export { upload, sendInvitations };