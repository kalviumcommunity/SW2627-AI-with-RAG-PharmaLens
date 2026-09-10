import { Router } from 'express';
import { uploadMiddleware } from '../middlewares/upload.middleware';
import { documentService } from '../services/document.service';
import { vectorService } from '../services/vector.service';

const router = Router();

router.post('/upload', uploadMiddleware.single('file'), async (req, res) => {
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

    // Process document into chunks
    const chunks = await documentService.processDocument(fileData.path, fileData.mimetype);

    return res.status(200).json({
      message: 'File uploaded and processed successfully',
      file: fileData,
      chunksGenerated: chunks.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/similarity', async (req, res) => {
  const { text1, text2 } = req.body;

  if (!text1 || !text2 || typeof text1 !== 'string' || typeof text2 !== 'string') {
    return res.status(400).json({ error: 'Both text1 and text2 string parameters are required.' });
  }

  try {
    const similarityScore = await vectorService.calculateTextSimilarity(text1, text2);

    return res.status(200).json({
      text1,
      text2,
      similarityScore,
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
