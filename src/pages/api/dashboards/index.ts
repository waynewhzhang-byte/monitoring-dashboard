import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { DashboardConfigSchema } from '@/types/dashboard-config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const result = DashboardConfigSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ error: 'Invalid configuration', details: result.error.format() });
      }

      const { id, name, description, layout, widgets, theme } = result.data;

      const dashboard = await prisma.dashboard.upsert({
        where: { id: id },
        update: {
          name,
          description,
          layout: layout as any,
          widgets: widgets as any,
          theme: theme as any,
        },
        create: {
          id,
          name,
          description,
          layout: layout as any,
          widgets: widgets as any,
          theme: theme as any,
        },
      });

      return res.status(200).json(dashboard);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
