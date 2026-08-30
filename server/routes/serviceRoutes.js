import express from 'express';
import prisma from '../config/db.js';

const router = express.Router();

/**
 * GET /api/services
 * Optional query: ?clinic=boisar or ?clinic=palghar-central
 */
router.get('/', async (req, res, next) => {
  try {
    const { clinic } = req.query;

    if (clinic) {
      const cleanClinic = clinic.toString().toLowerCase().trim();
      const foundClinic = await prisma.clinic.findFirst({
        where: {
          OR: [
            { slug: cleanClinic },
            { name: { contains: cleanClinic } },
            { id: cleanClinic }
          ]
        },
        include: {
          services: {
            include: {
              service: {
                include: {
                  clinics: {
                    include: { clinic: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!foundClinic) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLINIC_NOT_FOUND',
            message: `Clinic '${clinic}' not found.`
          }
        });
      }

      const services = foundClinic.services.map(cs => ({
        id: cs.service.id,
        name: cs.service.name,
        slug: cs.service.slug,
        description: cs.service.description,
        icon: cs.service.icon,
        availableAt: cs.service.clinics.map(c => c.clinic.name)
      }));

      return res.json({
        success: true,
        clinic: foundClinic.name,
        data: services
      });
    }

    // Return all services with their branch availability
    const allServices = await prisma.service.findMany({
      include: {
        clinics: {
          include: {
            clinic: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formatted = allServices.map(srv => ({
      id: srv.id,
      name: srv.name,
      slug: srv.slug,
      description: srv.description,
      icon: srv.icon,
      availableAt: srv.clinics.map(c => c.clinic.name)
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
});

export default router;
