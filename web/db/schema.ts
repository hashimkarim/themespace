import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const drafts = sqliteTable("theme_drafts", {
  ownerId: text("owner_id").primaryKey(),
  body: text("body").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const publishedThemes = sqliteTable(
  "published_themes",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    sourceId: text("source_id").notNull(),
    body: text("body").notNull(),
    version: integer("version").notNull(),
    publishedAt: text("published_at").notNull(),
  },
  (table) => [
    index("idx_themes_published_at").on(table.publishedAt),
    uniqueIndex("idx_themes_owner_source_version").on(
      table.ownerId,
      table.sourceId,
      table.version,
    ),
  ],
);
