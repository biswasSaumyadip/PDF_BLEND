import express, { Request, Response } from 'express';
const router = express.Router();

/* GET home page. */
router.get('/', (_: Request, res: Response) => {
  res.render('index', { title: 'PDF Blend' });
});

router.get('/merge-with-preview', (_: Request, res: Response) => {
  res.render('merge-with-preview', {
    title: 'PDF Blend with Preview',
    activePage: 'merge-with-preview',
  });
});

router.get('/merge', (_: Request, res: Response) => {
  res.render('merge', { title: 'Merge PDFs', activePage: 'merge' });
});

router.get('/remove', (_: Request, res: Response) => {
  res.render('remove', { title: 'Remove Pages', activePage: 'remove' });
});

router.get('/fix-links', (_: Request, res: Response) => {
  res.render('fix-links', { title: 'Fix PDF Links', activePage: 'fix-links' });
});

export default router;
