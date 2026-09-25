import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const settings = sqliteTable('settings',{id:text('id').primaryKey(),value:text('value').notNull()});
export const instructions = sqliteTable('instructions',{id:text('id').primaryKey(),operation:text('operation').notNull(),data:text('data').notNull(),version:integer('version').notNull().default(1),updated:text('updated').notNull(),driveId:text('drive_id')});
export const revisions = sqliteTable('revisions',{id:text('id').primaryKey(),instructionId:text('instruction_id').notNull(),data:text('data').notNull(),version:integer('version').notNull(),updated:text('updated').notNull()});
