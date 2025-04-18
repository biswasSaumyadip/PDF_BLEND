import open from 'open';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

(async () => {
  await open(`http://localhost:${PORT}`);
})();
