/**
 * Jest Global Setup
 * Runs once before all test suites
 */
export default async function setup() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5001';
  process.env.CLIENT_URL = 'http://localhost:3000';
  process.env.API_PREFIX = '/api';
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgresql://ngone:password@localhost:5432/ngone_test';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_key_at_least_32_characters_long_for_testing';
  process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_key_at_least_32_characters_long_for_testing';
  process.env.ACCESS_TOKEN_EXPIRES = '15m';
  process.env.REFRESH_TOKEN_EXPIRES = '7d';
  process.env.RESET_TOKEN_EXPIRES = '1h';
  process.env.ENABLE_SMS = 'false';
  process.env.ENABLE_EMAIL = 'false';
  process.env.ENABLE_PAYMENTS = 'false';
  process.env.ENABLE_SOCKET = 'false';
  process.env.AWS_REGION = 'ap-south-1';
  process.env.EMAIL_FROM = 'test@ngone.in';
  process.env.EMAIL_FROM_NAME = 'NGone Test';
  process.env.CLOUDINARY_FOLDER = 'ngone-test';
  process.env.MSG91_SENDER_ID = 'NGONE';
  process.env.MICROSOFT_TENANT_ID = 'common';
  process.env.DARPAN_API_URL = 'https://ngodarpan.gov.in/api/v1';

  console.info('✅ Test environment configured');
}
