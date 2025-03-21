import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.PORT) {
  throw new Error('Variável de ambiente PORT não definida');
}

if (!process.env.PASS) {
  throw new Error('Variável de ambiente PASS não definida');
}

if (!process.env.HOST) {
  throw new Error('Variável de ambiente HOST não definida');
}

export const env = {
  port: process.env.PORT!,
  pass: process.env.PASS!,
  host: process.env.HOST!
};
