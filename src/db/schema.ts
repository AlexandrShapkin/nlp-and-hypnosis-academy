import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const entities = sqliteTable(
  "entities",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    slug: text("slug").notNull(),
    version: integer("version").notNull(),
    state: text("state").notNull(),
    draft: text("draft").notNull(),
    published: text("published"),
    archived: integer("archived").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("entity_kind_slug").on(t.kind, t.slug)],
);
export const revisions = sqliteTable("revisions", {
  id: text("id").primaryKey(),
  entityId: text("entity_id")
    .notNull()
    .references(() => entities.id),
  schemaVersion: integer("schema_version").notNull(),
  payload: text("payload").notNull(),
  actorId: text("actor_id"),
  createdAt: text("created_at").notNull(),
});

export const publicationEvents = sqliteTable("publication_events", {
  entityId: text("entity_id")
    .primaryKey()
    .references(() => entities.id),
  publishedAt: text("published_at").notNull(),
});
