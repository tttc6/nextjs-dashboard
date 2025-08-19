import { seedDatabase } from '../lib/seed';

export async function GET() {
  try {
    await seedDatabase();
    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    return Response.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}
