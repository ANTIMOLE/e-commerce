// // @ts-ignore
// require('dotenv').config({ path: '../.env' });
// const { Pool } = require('pg');

// const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// pool.query(`
//   SELECT
//     COUNT(*) FILTER (WHERE images::text LIKE '%tokopedia-static.net%') AS broken,
//     COUNT(*) FILTER (WHERE images::text LIKE '%images.tokopedia.net/img%') AS working,
//     COUNT(*) AS total
//   FROM "products"
// `).then(r => {
//   console.log(r.rows[0]);
//   pool.end();
// }).catch(e => {
//   console.error(e);
//   pool.end();
// });
