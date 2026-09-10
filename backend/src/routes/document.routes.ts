import { Router } from 'express';
import { uploadMiddleware } from '../middlewares/upload.middleware';

const router = Router();

router.post('/upload', uploadMiddleware.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or invalid file type.' });
    }

    const fileData = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    };

    return res.status(200).json({
      message: 'File uploaded successfully',
      file: fileData,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Basic error handler for multer errors
router.use((err: any, req: any, res: any, next: any) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export const documentRoutes = router;
