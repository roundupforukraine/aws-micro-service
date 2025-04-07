import { generateApiKey } from '../../utils/apiKey';

describe('API Key Utils', () => {
  describe('generateApiKey', () => {
    it('should generate a 32-character hexadecimal string', () => {
      const apiKey = generateApiKey();

      expect(apiKey).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate unique keys', () => {
      const keys = new Set();
      for (let i = 0; i < 1000; i++) {
        keys.add(generateApiKey());
      }

      // All keys should be unique
      expect(keys.size).toBe(1000);
    });

    it('should generate valid hexadecimal strings', () => {
      const apiKey = generateApiKey();
      const buffer = Buffer.from(apiKey, 'hex');

      // Should be able to convert back to buffer without errors
      expect(buffer.length).toBe(16); // 16 bytes = 32 hex characters
      expect(buffer.toString('hex')).toBe(apiKey);
    });
  });
}); 