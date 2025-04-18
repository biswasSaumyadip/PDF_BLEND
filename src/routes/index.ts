import express, { Request, Response, NextFunction } from 'express';
const router = express.Router();

/* GET home page. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.render('index', { title: 'PDF Blend',  });
});

router.get('/merge-with-preview', (req: Request, res: Response) => {
  res.render('merge-with-preview', { title: 'PDF Blend with Preview', activePage: 'merge-with-preview' });
});

router.get('/merge', (req: Request, res: Response) => {
  res.render('merge', { title: 'Merge PDFs', activePage: 'merge' });
});

router.get('/remove', (req: Request, res: Response) => {
  res.render('remove', { title: 'Remove Pages', activePage: 'remove' });
});

router.get('/fix-links', (req: Request, res: Response) => {
  res.render('fix-links', { title: 'Fix PDF Links', activePage: 'fix-links' });
});

export default router;
