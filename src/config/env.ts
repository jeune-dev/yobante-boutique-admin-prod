import { z } from 'zod';

const envSchema = z.object({
  VITE_SHOP_API_URL: z.string().url('VITE_SHOP_API_URL must be a valid URL'),
  VITE_SHIPMENT_API_URL: z.string().url('VITE_SHIPMENT_API_URL must be a valid URL'),
  VITE_APP_NAME: z.string().default('Yobante Admin'),
  VITE_APP_VERSION: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  try {
    return envSchema.parse(import.meta.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(
        `❌ Missing or invalid environment variables:\n${missingVars}\n\nCreate a .env.local file with:\nVITE_SHOP_API_URL=https://api.yobanterek.com/api/v1\nVITE_SHIPMENT_API_URL=https://api.yobanterek.com/api/v1`
      );
    }
    throw error;
  }
};

export const ENV = parseEnv();
