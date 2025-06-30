import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../index.js';
import { validateUrl } from '../utils/validators.js';

const router = Router();

// Crear short link
router.post('/shorten', async (req, res) => {
  try {
    const { url, customCode, expiresIn } = req.body;

    // Validar URL
    if (!validateUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Generar código corto
    let shortCode = customCode || nanoid(8);
    
    // Verificar si el código ya existe
    const existingLink = await prisma.shortLink.findUnique({
      where: { shortCode }
    });

    if (existingLink) {
      if (customCode) {
        return res.status(409).json({ error: 'Custom code already exists' });
      }
      // Si es código generado, crear uno nuevo
      shortCode = nanoid(8);
    }

    // Calcular fecha de expiración
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000); // días a milisegundos
    }

    // Crear short link
    const shortLink = await prisma.shortLink.create({
      data: {
        originalUrl: url,
        shortCode,
        expiresAt
      }
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    res.status(201).json({
      id: shortLink.id,
      originalUrl: shortLink.originalUrl,
      shortCode: shortLink.shortCode,
      shortUrl: `${baseUrl}/${shortLink.shortCode}`,
      clicks: shortLink.clicks,
      createdAt: shortLink.createdAt,
      expiresAt: shortLink.expiresAt
    });
  } catch (error) {
    console.error('Error creating short link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener estadísticas de un short link
router.get('/stats/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    const shortLink = await prisma.shortLink.findUnique({
      where: { shortCode }
    });

    if (!shortLink) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    res.json({
      id: shortLink.id,
      originalUrl: shortLink.originalUrl,
      shortCode: shortLink.shortCode,
      shortUrl: `${baseUrl}/${shortLink.shortCode}`,
      clicks: shortLink.clicks,
      createdAt: shortLink.createdAt,
      updatedAt: shortLink.updatedAt,
      expiresAt: shortLink.expiresAt,
      isActive: shortLink.isActive
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Listar todos los short links
router.get('/links', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const [links, total] = await Promise.all([
      prisma.shortLink.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.shortLink.count()
    ]);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    const formattedLinks = links.map(link => ({
      id: link.id,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      shortUrl: `${baseUrl}/${link.shortCode}`,
      clicks: link.clicks,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      isActive: link.isActive
    }));

    res.json({
      links: formattedLinks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error listing links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Desactivar short link
router.delete('/links/:shortCode', async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;
    
    const shortLink = await prisma.shortLink.findUnique({
      where: { shortCode }
    });

    if (!shortLink) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    await prisma.shortLink.update({
      where: { shortCode },
      data: { isActive: false }
    });

    res.json({ message: 'Short link deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;