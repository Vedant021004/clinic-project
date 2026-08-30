import express from 'express';
import prisma from '../config/db.js';
import { calculateClinicStatus } from '../config/timezone.js';

const router = express.Router();

/**
 * GET /api/clinics
 * Returns list of all CareBridge clinics with server-calculated IST live status
 */
router.get('/', async (req, res, next) => {
  try {
    const clinics = await prisma.clinic.findMany({
      include: {
        services: {
          include: {
            service: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const enrichedClinics = clinics.map(clinic => {
      const liveStatus = calculateClinicStatus(clinic.openingHours);
      let parsedHours = {};
      try {
        parsedHours = JSON.parse(clinic.openingHours);
      } catch (e) {
        parsedHours = {};
      }

      return {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        address: clinic.address,
        city: clinic.city,
        state: clinic.state,
        pincode: clinic.pincode,
        phone: clinic.phone,
        landmark: clinic.landmark,
        tag: clinic.tag,
        hours: parsedHours,
        liveStatus,
        services: clinic.services.map(cs => cs.service.name)
      };
    });

    res.json({
      success: true,
      data: enrichedClinics
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clinics/:slug
 * Returns one clinic by slug or id
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const clinic = await prisma.clinic.findFirst({
      where: {
        OR: [
          { slug: slug.toLowerCase() },
          { id: slug }
        ]
      },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLINIC_NOT_FOUND',
          message: `Clinic with identifier '${slug}' was not found.`
        }
      });
    }

    const liveStatus = calculateClinicStatus(clinic.openingHours);
    let parsedHours = {};
    try {
      parsedHours = JSON.parse(clinic.openingHours);
    } catch (e) {
      parsedHours = {};
    }

    res.json({
      success: true,
      data: {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        address: clinic.address,
        city: clinic.city,
        state: clinic.state,
        pincode: clinic.pincode,
        phone: clinic.phone,
        landmark: clinic.landmark,
        tag: clinic.tag,
        hours: parsedHours,
        liveStatus,
        services: clinic.services.map(cs => ({
          id: cs.service.id,
          name: cs.service.name,
          slug: cs.service.slug,
          description: cs.service.description,
          icon: cs.service.icon
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
