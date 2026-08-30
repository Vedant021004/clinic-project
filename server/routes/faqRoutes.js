import express from 'express';
import prisma from '../config/db.js';

const router = express.Router();

/**
 * GET /api/faq
 * Optional query: ?search=insurance
 */
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;

    let whereClause = {};
    if (search && search.toString().trim().length > 0) {
      const q = search.toString().trim();
      whereClause = {
        OR: [
          { question: { contains: q } },
          { answer: { contains: q } },
          { category: { contains: q } }
        ]
      };
    }

    const faqs = await prisma.fAQItem.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: faqs
    });
  } catch (err) {
    next(err);
  }
});

export default router;
