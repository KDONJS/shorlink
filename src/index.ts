import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import shortLinkRoutes from './routes/shortLinks.js';
import { errorHandler } from './middleware/errorHandler.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar Prisma
export const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Endpoint de configuración para el frontend
app.get('/api/config', (req: express.Request, res: express.Response) => {
  res.json({
    baseUrl: process.env.BASE_URL || 'http://localhost:3000'
  });
});

// Rutas
app.use('/api', shortLinkRoutes);

// Ruta para redireccionar
app.get('/:shortCode', async (req: express.Request, res: express.Response) => {
  try {
    const { shortCode } = req.params;
    
    const shortLink = await prisma.shortLink.findUnique({
      where: { shortCode, isActive: true }
    });

    if (!shortLink) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    // Verificar si ha expirado
    if (shortLink.expiresAt && shortLink.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Short link has expired' });
    }

    // Incrementar contador de clicks
    await prisma.shortLink.update({
      where: { id: shortLink.id },
      data: { clicks: { increment: 1 } }
    });

    res.redirect(shortLink.originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware de manejo de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

// Ruta para servir index.html con configuración inyectada
app.get('/', (req: express.Request, res: express.Response) => {
  const fs = require('fs');
  const path = require('path');
  
  let html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  
  // Inyectar configuración
  const config = `
    <script>
      window.APP_CONFIG = {
        baseUrl: '${process.env.BASE_URL || 'http://localhost:3000'}'
      };
    </script>
  `;
  
  html = html.replace('</head>', config + '</head>');
  res.send(html);
});