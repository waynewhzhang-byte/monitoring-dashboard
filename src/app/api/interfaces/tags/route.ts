import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/interfaces/tags
 * Returns all unique tags assigned to interfaces
 */
export async function GET(req: NextRequest) {
  try {
    // Fetch all interfaces and extract unique tags
    const interfaces = await prisma.interface.findMany({
      select: {
        tags: true
      }
    });

    // Extract all tags and get unique set
    const allTags = new Set<string>();
    interfaces.forEach(iface => {
      if (iface.tags && Array.isArray(iface.tags)) {
        iface.tags.forEach(tag => {
          if (tag && typeof tag === 'string') {
            allTags.add(tag);
          }
        });
      }
    });

    // Convert to sorted array
    const uniqueTags = Array.from(allTags).sort();

    return NextResponse.json({ tags: uniqueTags });
  } catch (error) {
    console.error('Failed to fetch interface tags:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
