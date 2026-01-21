import { pgTable, varchar, text, timestamp, decimal, integer, boolean, uuid, date, primaryKey } from 'drizzle-orm/pg-core'

// Users table - syncs with Clerk
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Clerk user ID
  email: varchar('email', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Custom cameras
export const cameras = pgTable('cameras', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  sensorWidth: decimal('sensor_width', { precision: 8, scale: 3 }),
  sensorHeight: decimal('sensor_height', { precision: 8, scale: 3 }),
  pixelSize: decimal('pixel_size', { precision: 6, scale: 3 }),
  resolutionWidth: integer('resolution_width'),
  resolutionHeight: integer('resolution_height'),
  type: varchar('type', { length: 50 }), // cooled, uncooled, dslr, integrated
  isColor: boolean('is_color').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Custom optics (telescopes, lenses)
export const optics = pgTable('optics', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  focalLength: decimal('focal_length', { precision: 8, scale: 2 }).notNull(),
  aperture: decimal('aperture', { precision: 8, scale: 2 }),
  fRatio: decimal('f_ratio', { precision: 5, scale: 2 }),
  type: varchar('type', { length: 50 }), // refractor, reflector, camera-lens
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Custom setups (camera + optic combinations)
export const setups = pgTable('setups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // Can reference custom camera/optic OR built-in gear by string ID
  cameraId: uuid('camera_id').references(() => cameras.id, { onDelete: 'set null' }),
  opticId: uuid('optic_id').references(() => optics.id, { onDelete: 'set null' }),
  defaultCameraId: varchar('default_camera_id', { length: 100 }), // Built-in camera ID
  defaultOpticId: varchar('default_optic_id', { length: 100 }), // Built-in optic ID
  focalLength: decimal('focal_length', { precision: 8, scale: 2 }).notNull(),
  pixelScale: decimal('pixel_scale', { precision: 8, scale: 4 }),
  fovWidth: decimal('fov_width', { precision: 10, scale: 2 }),
  fovHeight: decimal('fov_height', { precision: 10, scale: 2 }),
  category: varchar('category', { length: 50 }), // main-rig, grab-and-go, widefield, planetary
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Saved imaging plans with snapshot data
export const imagingPlans = pgTable('imaging_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  planDate: date('plan_date').notNull(),
  locationName: varchar('location_name', { length: 255 }),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 11, scale: 7 }),
  // Conditions snapshot
  moonPhase: varchar('moon_phase', { length: 50 }),
  moonIllumination: integer('moon_illumination'),
  seeing: decimal('seeing', { precision: 3, scale: 1 }),
  transparency: integer('transparency'),
  cloudCover: integer('cloud_cover'),
  temperature: decimal('temperature', { precision: 5, scale: 1 }),
  notes: text('notes'),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Targets within imaging plans
export const imagingPlanTargets = pgTable('imaging_plan_targets', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => imagingPlans.id, { onDelete: 'cascade' }),
  targetId: varchar('target_id', { length: 50 }).notNull(), // ID from DSO_DATABASE
  targetName: varchar('target_name', { length: 255 }).notNull(),
  priority: integer('priority').notNull().default(1),
  visibilityScore: integer('visibility_score'),
  gearScore: integer('gear_score'),
  // Can reference custom setup OR built-in setup
  setupId: uuid('setup_id').references(() => setups.id, { onDelete: 'set null' }),
  defaultSetupId: varchar('default_setup_id', { length: 100 }), // Built-in setup ID
  transitTime: timestamp('transit_time'),
  hoursAbove30: decimal('hours_above_30', { precision: 4, scale: 2 }),
  moonSeparation: decimal('moon_separation', { precision: 5, scale: 1 }),
  notes: text('notes')
})

// User-defined tags for journal entries
export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }), // Hex color
  createdAt: timestamp('created_at').defaultNow().notNull()
})

// Journal entries
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'), // Markdown content
  entryDate: date('entry_date').notNull(),
  imagingPlanId: uuid('imaging_plan_id').references(() => imagingPlans.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Junction table for journal entries and tags (many-to-many)
export const journalEntryTags = pgTable('journal_entry_tags', {
  journalEntryId: uuid('journal_entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' })
}, (table) => ({
  pk: primaryKey({ columns: [table.journalEntryId, table.tagId] })
}))

// Saved locations (migrated from localStorage)
export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 7 }).notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
