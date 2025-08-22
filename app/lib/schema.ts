import { pgTable, varchar, uuid, integer, date, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  email: text().notNull(),
  password: text().notNull(),
}, (table) => [
  unique("users_email_key").on(table.email),
]);

// Customers table  
export const customers = pgTable('customers', {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  imageUrl: varchar("image_url", { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Invoices table
export const invoices = pgTable('invoices', {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  amount: integer().notNull(),
  status: varchar({ length: 255 }).notNull(),
  date: date().notNull(),
});

// Revenue table
export const revenue = pgTable('revenue', {
  month: varchar({ length: 4 }).notNull(),
  revenue: integer().notNull(),
}, (table) => [
  unique("revenue_month_key").on(table.month),
]);

// Define relations
export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
}));

// Export types for use in application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type Revenue = typeof revenue.$inferSelect;
export type NewRevenue = typeof revenue.$inferInsert;