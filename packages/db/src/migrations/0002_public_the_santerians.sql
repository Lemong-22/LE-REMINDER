ALTER TABLE `todos` ADD `position` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Backfill existing rows to their current createdAt order (0,1,2,...) per
-- user, so the new `position` column doesn't leave every pre-existing
-- todo tied at the schema default of 0 — that would make the list's
-- displayed order after this migration undefined instead of matching
-- what the user already sees today. New rows never rely on this default;
-- the `add` mutation always sets an explicit position.
UPDATE `todos`
SET `position` = (
  SELECT COUNT(*)
  FROM `todos` AS t2
  WHERE t2.`user_id` = `todos`.`user_id`
    AND (
      t2.`created_at` < `todos`.`created_at`
      OR (t2.`created_at` = `todos`.`created_at` AND t2.`id` < `todos`.`id`)
    )
);