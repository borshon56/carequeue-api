import { DataSource } from 'typeorm';
try {
    process.loadEnvFile('.env');
}
catch { }
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
//# sourceMappingURL=data-source.js.map