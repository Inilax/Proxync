import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://proxync:proxync_dev@localhost:5432/proxync?schema=public',
  },
});
