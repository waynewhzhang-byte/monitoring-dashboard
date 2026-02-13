import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/devices/tags
 * Returns all unique tags assigned to devices
 */
export async function GET(req: NextRequest) {
  try {
    // Fetch all devices and extract unique tags
    const devices = await prisma.device.findMany({
      select: {
        tags: true
      }
    });

    // Extract all tags and get unique set
    const allTags = new Set<string>();
    devices.forEach(device => {
      if (device.tags && Array.isArray(device.tags)) {
        device.tags.forEach(tag => {
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
    console.error('Failed to fetch device tags:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
