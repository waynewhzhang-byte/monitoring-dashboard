import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const dashboard = await prisma.dashboard.findUnique({
        where: { id: String(id) },
      });

      if (!dashboard) {
        return res.status(404).json({ error: 'Dashboard not found' });
      }

      return res.status(200).json(dashboard);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
