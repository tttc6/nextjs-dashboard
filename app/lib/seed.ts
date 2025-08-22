import bcrypt from 'bcrypt';
import db from './db';
import { users as usersTable, customers as customersTable, invoices as invoicesTable, revenue as revenueTable } from './schema';
import { eq, count } from 'drizzle-orm';
import { invoices, customers, revenue, users } from './placeholder-data';

export async function seedUsers() {
  console.log('🌱 Seeding users...');
  
  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Check if user exists
      const existingUser = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
      
      if (existingUser.length === 0) {
        return await db.insert(usersTable).values({
          id: user.id,
          name: user.name,
          email: user.email,
          password: hashedPassword,
        }).returning();
      }
      return existingUser[0];
    })
  );

  console.log(`✅ Seeded ${insertedUsers.length} users`);
  return insertedUsers;
}

export async function seedCustomers() {
  console.log('🌱 Seeding customers...');
  
  const insertedCustomers = await Promise.all(
    customers.map(async (customer) => {
      // Check if customer exists
      const existingCustomer = await db.select().from(customersTable).where(eq(customersTable.id, customer.id)).limit(1);
      
      if (existingCustomer.length === 0) {
        return await db.insert(customersTable).values({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          imageUrl: customer.image_url,
        }).returning();
      }
      return existingCustomer[0];
    })
  );

  console.log(`✅ Seeded ${insertedCustomers.length} customers`);
  return insertedCustomers;
}

export async function seedInvoices() {
  console.log('🌱 Seeding invoices...');
  
  // Check if invoices already exist to avoid duplicates
  const existingInvoicesCount = await db.select({ count: count() }).from(invoicesTable);
  
  if (existingInvoicesCount[0].count > 0) {
    console.log(`ℹ️  Found ${existingInvoicesCount[0].count} existing invoices, skipping seeding`);
    return [];
  }
  
  const insertedInvoices = await db.insert(invoicesTable).values(
    invoices.map((invoice) => ({
      customerId: invoice.customer_id,
      amount: invoice.amount,
      status: invoice.status,
      date: invoice.date,
    }))
  ).returning();

  console.log(`✅ Seeded ${insertedInvoices.length} invoices`);
  return insertedInvoices;
}

export async function seedRevenue() {
  console.log('🌱 Seeding revenue...');
  
  const insertedRevenue = await Promise.all(
    revenue.map(async (rev) => {
      // Check if revenue record exists
      const existingRevenue = await db.select().from(revenueTable).where(eq(revenueTable.month, rev.month)).limit(1);
      
      if (existingRevenue.length === 0) {
        return await db.insert(revenueTable).values({
          month: rev.month,
          revenue: rev.revenue,
        }).returning();
      }
      return existingRevenue[0];
    })
  );

  console.log(`✅ Seeded ${insertedRevenue.length} revenue records`);
  return insertedRevenue;
}

export async function seedDatabase() {
  try {
    console.log('🚀 Starting database seeding...');
    
    await seedUsers();
    await seedCustomers();
    await seedRevenue();
    await seedInvoices();
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}