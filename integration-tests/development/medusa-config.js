const DB_NAME = process.env.DB_NAME
const DB_USERNAME = process.env.DB_USERNAME
const DB_PASSWORD = process.env.DB_PASSWORD
const DB_HOST = process.env.DB_HOST
const DB_PORT = process.env.DB_PORT
const DB_DATABASE = process.env.DB_DATABASE

const DATABASE_URL = 
  `postgres://${DB_USERNAME}:${DB_PASSWORD}` + 
  `@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`
module.exports = {
  plugins: [
    {
      resolve: `./packages/medusa-payment-stripe`,
      options: {
        api_key: "api_key",
        webhook_secret: "api_key",
      },
    },
  ],
  projectConfig: {
    redis_url: process.env.REDIS_URL,
    database_url: `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`,
    database_type: "postgres",
    jwt_secret: "test",
    cookie_secret: "test",
    database_extra: { ssl: { rejectUnauthorized: false } },
  },
}
