// __tests__/domain-config.test.js
require('dotenv').config({ override: true });

describe('Domain Configuration Validation', () => {
  const EXPECTED_DOMAIN = 'calculaaiabr.com';
  const EXPECTED_APP_URL = 'https://app.calculaaiabr.com';

  describe('Environment Variables', () => {
    test('FRONTEND_ORIGIN should use calculaaiabr.com domain', () => {
      const frontendOrigin = process.env.FRONTEND_ORIGIN;
      expect(frontendOrigin).toBeDefined();
      expect(frontendOrigin).toContain(EXPECTED_DOMAIN);
      expect(frontendOrigin).toBe(EXPECTED_APP_URL);
    });

    test('FRONTEND_URL should use calculaaiabr.com domain', () => {
      const frontendUrl = process.env.FRONTEND_URL;
      expect(frontendUrl).toBeDefined();
      expect(frontendUrl).toContain(EXPECTED_DOMAIN);
      expect(frontendUrl).toBe(EXPECTED_APP_URL);
    });

    test('COOKIE_DOMAIN should be configured for calculaaiabr.com', () => {
      const cookieDomain = process.env.COOKIE_DOMAIN;
      expect(cookieDomain).toBeDefined();
      expect(cookieDomain).toBe(`.${EXPECTED_DOMAIN}`);
    });

    test('MP_RETURN_URL should use calculaaiabr.com domain', () => {
      const returnUrl = process.env.MP_RETURN_URL;
      expect(returnUrl).toBeDefined();
      expect(returnUrl).toContain(EXPECTED_DOMAIN);
      expect(returnUrl).toMatch(/^https:\/\/app\.calculaaiabr\.com/);
    });
  });

  describe('Application Configuration', () => {
    test('CORS should include calculaaiabr.com in allowed origins', () => {
      // Read the app.js file to verify static configuration
      const fs = require('fs');
      const path = require('path');
      const appFile = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
      
      expect(appFile).toContain('https://app.calculaaiabr.com');
      expect(appFile).toContain('calculaaiabr.com');
    });

    test('userRoutes should reference calculaaiabr.com in comments', () => {
      const fs = require('fs');
      const path = require('path');
      const userRoutesFile = fs.readFileSync(
        path.join(__dirname, '..', 'src', 'routes', 'userRoutes.js'), 
        'utf8'
      );
      
      expect(userRoutesFile).toContain('calculaaiabr.com');
      expect(userRoutesFile).toContain('COOKIE_DOMAIN=.calculaaiabr.com');
    });
  });

  describe('Domain Configuration Consistency', () => {
    test('All frontend URLs should be consistent', () => {
      const frontendOrigin = process.env.FRONTEND_ORIGIN;
      const frontendUrl = process.env.FRONTEND_URL;
      
      expect(frontendOrigin).toBe(frontendUrl);
      expect(frontendOrigin).toBe(EXPECTED_APP_URL);
    });

    test('Cookie domain should match frontend domain', () => {
      const cookieDomain = process.env.COOKIE_DOMAIN;
      const frontendOrigin = process.env.FRONTEND_ORIGIN;
      
      if (frontendOrigin) {
        const url = new URL(frontendOrigin);
        const expectedCookieDomain = `.${url.hostname.replace('app.', '')}`;
        expect(cookieDomain).toBe(expectedCookieDomain);
      }
    });

    test('Return URL should use same domain as frontend', () => {
      const returnUrl = process.env.MP_RETURN_URL;
      const frontendOrigin = process.env.FRONTEND_ORIGIN;
      
      if (returnUrl && frontendOrigin) {
        const returnUrlObj = new URL(returnUrl);
        const frontendUrlObj = new URL(frontendOrigin);
        expect(returnUrlObj.hostname).toBe(frontendUrlObj.hostname);
      }
    });
  });

  describe('Security Configuration', () => {
    test('All URLs should use HTTPS', () => {
      const urls = [
        process.env.FRONTEND_ORIGIN,
        process.env.FRONTEND_URL,
        process.env.MP_RETURN_URL
      ].filter(Boolean);

      urls.forEach(url => {
        expect(url).toMatch(/^https:/);
      });
    });

    test('Cookie domain should start with dot for subdomain sharing', () => {
      const cookieDomain = process.env.COOKIE_DOMAIN;
      if (cookieDomain) {
        expect(cookieDomain).toMatch(/^\./);
      }
    });
  });
});