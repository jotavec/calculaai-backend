# Domain References: calculaaiabr.com

This document lists all occurrences of the `calculaaiabr.com` domain in the codebase for easy maintenance and reference.

## Environment Variables (.env)

1. **FRONTEND_ORIGIN**: `"https://app.calculaaiabr.com"`
   - Used for CORS configuration
   - Allows frontend to make API requests

2. **FRONTEND_URL**: `"https://app.calculaaiabr.com"`
   - Alternative frontend URL configuration
   - Used as fallback/secondary origin

3. **COOKIE_DOMAIN**: `.calculaaiabr.com`
   - Enables cookies to work across subdomains (app.*, api.*)
   - Required for authentication between frontend and backend

4. **MP_RETURN_URL**: `"https://app.calculaaiabr.com/pagamento/retorno"`
   - Mercado Pago payment return URL
   - Users are redirected here after payment processing

## Source Code Files

### app.js
- **Line 57**: Comment documenting CORS policy
  ```javascript
  * - https://app.calculaaiabr.com (frontend prod via Cloudflare)
  ```
- **Line 63**: CORS allowed origins array
  ```javascript
  'https://app.calculaaiabr.com',
  ```

### src/routes/userRoutes.js
- **Line 26**: Comment explaining cookie domain configuration
  ```javascript
  // Defina no .env -> COOKIE_DOMAIN=.calculaaiabr.com para funcionar em app. e api.
  ```

## Configuration Purpose

The domain `calculaaiabr.com` is used for:
- **Production frontend**: Hosted at `https://app.calculaaiabr.com`
- **Cross-subdomain authentication**: Cookie sharing between app.* and api.*
- **Payment processing**: Return URL for Mercado Pago integration
- **CORS security**: Ensuring only authorized origins can access the API

## Maintenance Notes

When updating the domain:
1. Update all environment variables in `.env`
2. Update the hardcoded reference in `app.js` STATIC_ALLOWED array
3. Update the comment in `userRoutes.js` if domain changes
4. Ensure DNS and SSL certificates are properly configured
5. Test payment flow with new return URL

## Security Considerations

- Cookie domain uses leading dot (`.calculaaiabr.com`) for subdomain sharing
- All URLs use HTTPS for security
- CORS configuration restricts access to authorized origins only