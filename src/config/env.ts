import dotenv from 'dotenv';

dotenv.config();

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DATABASE_URL: req('DATABASE_URL'),
  JWT_SECRET: req('JWT_SECRET'),
  MESSAGE_RATE_LIMIT: parseInt(process.env.MESSAGE_RATE_LIMIT || '5', 10),
  MESSAGE_RATE_WINDOW_MS: parseInt(process.env.MESSAGE_RATE_WINDOW_MS || '10000', 10),
};

