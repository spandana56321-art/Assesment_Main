const fs = require('fs');
const path = require('path');
const Exam = require('../models/Exam');
const User = require('../models/User');

const MEDIA_ROOT = path.join(__dirname, '..', 'uploads');
const RECORDINGS_DIR = path.join(MEDIA_ROOT, 'recordings');
const DOCUMENTS_DIR = path.join(MEDIA_ROOT, 'documents');
const PHOTOS_DIR = path.join(MEDIA_ROOT, 'photos');

for (const dir of [RECORDINGS_DIR, DOCUMENTS_DIR, PHOTOS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeExt(name, fallback = '.bin') {
  const ext = path.extname(name || '').toLowerCase();
  return ext && ext.length <= 8 ? ext : fallback;
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function uploadVerification(req, res) {
  try {
    const { documentType, photoDataUrl } = req.body;
    const file = req.file;

    if (!['aadhaar', 'pan'].includes(String(documentType || '').toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Select Aadhaar or PAN.' });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: 'Identity document is required.' });
    }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only PDF, JPG, PNG or WEBP documents are allowed.' });
    }
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Identity document must be 5 MB or smaller.' });
    }

    const parsedPhoto = parseDataUrl(photoDataUrl);
    if (!parsedPhoto || parsedPhoto.buffer.length === 0 || parsedPhoto.buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'A valid captured camera photo is required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const userKey = String(user._id);
    const documentPath = path.join(DOCUMENTS_DIR, `${userKey}${safeExt(file.originalname, file.mimetype === 'application/pdf' ? '.pdf' : '.jpg')}`);
    const photoExt = parsedPhoto.mimeType === 'image/png' ? '.png' : parsedPhoto.mimeType === 'image/webp' ? '.webp' : '.jpg';
    const photoPath = path.join(PHOTOS_DIR, `${userKey}${photoExt}`);

    fs.writeFileSync(documentPath, file.buffer);
    fs.writeFileSync(photoPath, parsedPhoto.buffer);

    user.identityVerification = {
      documentType: String(documentType).toLowerCase(),
      documentOriginalName: file.originalname,
      documentMimeType: file.mimetype,
      documentSize: file.size,
      documentPath: path.relative(MEDIA_ROOT, documentPath),
      photoMimeType: parsedPhoto.mimeType,
      photoPath: path.relative(MEDIA_ROOT, photoPath),
      verifiedAt: new Date(),
    };
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Identity documents saved securely.',
      verification: {
        documentType: user.identityVerification.documentType,
        documentOriginalName: user.identityVerification.documentOriginalName,
        verifiedAt: user.identityVerification.verifiedAt,
      },
    });
  } catch (error) {
    console.error('Verification upload error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save identity documents.' });
  }
}

async function uploadRecording(req, res) {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    if (String(exam.user) !== String(req.user.id)) return res.status(403).json({ success: false, message: 'You cannot upload a recording for this exam.' });
    if (exam.status !== 'completed') return res.status(400).json({ success: false, message: 'Recording can only be finalized after assessment submission.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Recording file is required.' });
    if (!req.file.mimetype.startsWith('video/')) return res.status(400).json({ success: false, message: 'Only video recordings are accepted.' });
    if (req.file.size === 0 || req.file.size > 100 * 1024 * 1024) return res.status(400).json({ success: false, message: 'Recording must be between 1 byte and 100 MB.' });

    const recordingPath = path.join(RECORDINGS_DIR, `${exam._id}${safeExt(req.file.originalname, '.webm')}`);
    fs.writeFileSync(recordingPath, req.file.buffer);

    exam.recording = {
      path: path.relative(MEDIA_ROOT, recordingPath),
      mimeType: req.file.mimetype,
      size: req.file.size,
      originalName: req.file.originalname,
      uploadedAt: new Date(),
    };
    await exam.save();

    return res.status(200).json({
      success: true,
      message: 'Assessment recording saved.',
      recording: { size: req.file.size, mimeType: req.file.mimetype, uploadedAt: exam.recording.uploadedAt },
    });
  } catch (error) {
    console.error('Recording upload error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save assessment recording.' });
  }
}

function streamFile(req, res, filePath, mimeType) {
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found.' });
  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Content-Type', mimeType || 'application/octet-stream');

  if (!range) {
    res.setHeader('Content-Length', stat.size);
    return fs.createReadStream(filePath).pipe(res);
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) return res.status(416).end();
  const start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2] || 0));
  const end = match[2] ? Number(match[2]) : stat.size - 1;
  if (start > end || start >= stat.size) return res.status(416).end();

  res.status(206);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
  res.setHeader('Content-Length', end - start + 1);
  return fs.createReadStream(filePath, { start, end }).pipe(res);
}

async function adminRecording(req, res) {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    if (exam.status !== 'completed') return res.status(409).json({ success: false, message: 'Recording is available after submission.' });
    if (!exam.recording?.path) return res.status(404).json({ success: false, message: 'No recording is available for this attempt.' });
    return streamFile(req, res, path.join(MEDIA_ROOT, exam.recording.path), exam.recording.mimeType);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to open recording.' });
  }
}

async function adminDocument(req, res) {
  try {
    const exam = await Exam.findById(req.params.id).populate('user');
    if (!exam?.user) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const verification = exam.user.identityVerification;
    const key = req.params.kind;
    if (!verification) return res.status(404).json({ success: false, message: 'No identity verification documents found.' });

    if (key === 'photo') {
      return streamFile(req, res, path.join(MEDIA_ROOT, verification.photoPath), verification.photoMimeType);
    }
    if (key === 'document') {
      return streamFile(req, res, path.join(MEDIA_ROOT, verification.documentPath), verification.documentMimeType);
    }
    return res.status(400).json({ success: false, message: 'Unknown document type.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to open document.' });
  }
}

module.exports = { uploadVerification, uploadRecording, adminRecording, adminDocument };
