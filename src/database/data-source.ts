/**
 * TypeORM CLI data source (shared, used only for migrations).
 * Every member puts migrations in src/database/migrations/ with a timestamp prefix;
 * they are picked up automatically, in timestamp order.
 *
 *   npm run build && npm run migration:run      apply pending migrations
 *   npm run build && npm run migration:revert   undo the last one
 */
import { DataSource } from 'typeorm';

try { process.loadEnvFile('.env'); } catch { /* variables supplied by the environment */ }

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'carequeue',
  entities: [`${import.meta.dirname}/../**/*.entity.js`],
  migrations: [`${import.meta.dirname}/migrations/*.js`],
  synchronize: false,
});
