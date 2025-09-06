import { NextRequest, NextResponse } from 'next/server';
import { getRunner } from '@/server/datasource';

export async function GET(request: NextRequest) {
  try {
    const runner = getRunner('ptl_prod_timeline');
    if (!runner) {
      return NextResponse.json({ error: 'PTL timeline runner not found' }, { status: 404 });
    }

    const result = await runner({});
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching PTL timeline:', error);
    return NextResponse.json({ error: 'Failed to fetch PTL timeline data' }, { status: 500 });
  }
}
