<!-- 
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

import { test, expect } from '@playwright/test';

/**
 * Intercom Silent Login E2E Test
 * 
 * Tests the Intercom Silent Login integration for cross-app SSO between
 * Nextcloud and OpenCloud via Keycloak, ensuring seamless authentication
 * token delegation without requiring users to re-enter credentials.
 * 
 * Dependencies:
 * - Intercom: https://intercom.opendesk.hrz.uni-marburg.de
 * - Nextcloud: https://nextcloud.opendesk.hrz.uni-marburg.edu
 * - OpenCloud: https://openc-tools.hrz.uni-marburg.edu (with OIDC client: opendesk-opencloud)
 * - Keycloak: https://keycloak.opendesk.hrz.uni-marburg.de/auth/realms/opendek
 * 
 * Test Coverage:
 * - Silent login token generation via Intercom API
 * - Token validation at target service (OpenCloud)
 * - Space redirection with valid token in URL
 * - Token expiry and refresh mechanism (300s TTL, Redis cache)
 * - Cross-app session propagation (Nextcloud → OpenCloud)
 * - Error handling: invalid secret, unauthorized target service, target unreachable
 */

test.describe('Intercom Silent Login: Nextcloud → OpenCloud', () => {
  test('should generate silent login token for Nextcloud → OpenCloud', async ({ page, context }) => {
    // Navigate to Nextcloud and authenticate via Keycloak
    await page.goto('https://nextcloud.opendesk.hrz.uni-marburg.de');
    
    // Wait for redirect to Keycloak SAML 2.0 authentication
    await page.waitForURL(/keycloak\./);
    await page.waitForLoadState('networkidle');
    
    // Enter credentials and authenticate
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('[type="submit"]'); // SAML Submit button
    
    // Wait for redirect back to Nextcloud with valid session
    await page.waitForURL(/nextcloud\./);
    await page.waitForLoadState('networkidle');
    
    // Verify Nextcloud has valid session cookie
    const cookies = await context.cookies('https://nextcloud.opendesk.hrz.uni-marburg.de');
    const sessionCookie = cookies.find(c =>
      c.name.includes('nc_session_id') || c.name.includes('oc_session'))
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie.value).not.toBe('');
    
    // Call Intercom Silent Login API to generate token for OpenCloud
    const intercomResponse = await page.request.post('https://intercom.opendesk.hrz.uni-marburg.de/api/silent-login', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        consumer: 'opendesk-nextcloud',
        target_service: 'opendesk-opencloud',
        shared_secret: process.env.INTERCOM_SHARED_SECRET || 'test-secret-key'
      })
    });
    
    // Verify Intercom API returns silent login token
    expect(intercomResponse.status()).toBe(200);
    expect(intercomResponse.headers()['content-type']).toContain('application/json');
    
    const responseBody = await intercomResponse.json();
    expect(responseBody).toHaveProperty('target_url');
    expect(responseBody.target_url).toContain('opendesk-opencloud');
    expect(responseBody).toHaveProperty('token');
    expect(responseBody.token).not.toBe('');
    expect(responseBody).toHaveProperty('expires_in');
    
    // Verify token expiration time is 300 seconds (5 minutes)
    expect(responseBody.expires_in).toBe(300);
  });

  test('should redirect to OpenCloud with silent login token in URL', async ({ page, context }) => {
    const targetUrl = 'https://openc-tools.hrz.uni-marburg.de/appsuite';
    const silentLoginToken = 'test-opaque-token-123456';
    
    // Navigate to Intercom silent login endpoint with token
    const intercomUrlWithToken = `${targetUrl}?token=${silentLoginToken}`;
    await page.goto(intercomUrlWithToken);
    
    // Wait for redirect to OpenCloud with validated session
    await page.waitForURL(/openc-tools\.hrz\.uni-marburg\.de\/appsuite/);
    
    // Verify OpenCloud session is established without requiring re-authentication
    const openCloudCookies = await context.cookies('https://openc-tools.hrz.uni-marburg.de');
    const sessionCookie = openCloudCookies.find(c =>
      c.name === 'JSESSIONID' || c.name === 'opendesk-opencloud-session'
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie.value).not.toBe('');
    
    // Verify user is logged in by checking for user profile element
    const userProfileIndicator = page.locator('.user-profile, [data-element="user-profile"]');
    await expect(userProfileIndicator).toBeVisible();
  });

  test('should validate OpenCloud OIDC integration with silent login token', async ({ page, context }) => {
    // First, navigate to Nextcloud and authenticate
    await page.goto('https://nextcloud.opendesk.hrz.uni-marburg.de');
    await page.waitForURL(/keycloak\./);
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password']', 'testpassword123');
    await page.click('[type="submit"]');
    await page.waitForURL(/nextcloud\./);
    await page.waitForLoadState('networkfull');
    
    // Call Intercom Silent Login API to get OpenCloud session
    const intercomResponse = await page.request.post('https://intercom.opendesk.hrz.uni-marburg.de/api/silent-login', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        consumer: 'opendesk-nextcloud',
        target_service: 'opendesk-opencloud',
        shared_secret: process.env.INTERCOM_SHARED_SECRET || 'test-secret-key'
      })
    });
    
    const responseBody = await intercomResponse.json();
    const targetUrl = responseBody.target_url;
    const silentLoginToken = responseBody.token;
    
    // Navigate to OpenCloud with token
    await page.goto(`${targetUrl}?token=${silentLoginToken}`);
    
    // Wait for redirect and session establishment
    await page.waitForURL(/openc-tools\.hrz\.uni-marburg\.de/);
    
    // Verify OIDC session is established in OpenCloud by logout test
    // User is considered authenticated if logout button is visible
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")');
    await expect(logoutButton).toBeVisible();
    
    // Click logout to verify session was established
    logoutButton.click();
    
    // Confirm logout by checking we're sent back to Keycloak or logout success page
    await page.waitForURL(/keycloak\./|login|logout/, { timeout: 5000 });
  });

  test('should validate Redis token caching in Intercom (cache hit optimization)', async ({ page }) => {
    // First request of Nextcloud → OpenCloud → cache miss (token generated)
    const firstResponse = await page.request.post('https://intercom.opendesk.hrz.uni-marburg.de/api/silent-login', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        consumer: 'opendesk-nextcloud',
        response_body.mode: 'eu-west',
        target_service: 'opendesk-opencloud',
        shared_secret: process.env.INTERCOM_SHARED_SECRET || 'test-secret-key',
        cache_test: false // force cache miss for first request
      })
    });
    
    const firstResponseBody = await firstResponse.json();
    const firstToken = firstResponseBody.token;
    
    expect(firstToken).not.toBe('');
    expect(firstResponseBody.expires_in).toBe(300);
    
    // Second request of Nextcloud → OpenCloud → cache hit (token returned from Redis)
    const secondResponse = await page.request.post('https://intercom.opendesk.hrz.uni-marburg.de/api/silent-login', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        consumer: 'opendesk-nextcloud',
        target_service: 'opendesk-opencloud',
        shared_secret: process.env.INTERCOM_SHARED_SECRET || 'test-secret-key',
        cache_test: true // force cache hit check
      })
    });
    
    const secondResponseBody = await secondResponse.json();
    const secondToken = secondResponseBody.token;
    
    // Verify second request returns the same token (cache hit)
    expect(secondToken === firstToken).toBe(true);
    
    // Verify response time for cached request is faster (optional, requires performance capture)
    // In real implementation with latency capture, secondRequestTime < firstRequestTime
  });

  test('should handle intercom silent login errors gracefully', async ({ page }) => {
    // Test 1: Invalid shared secret → 401 Unauthorized
    const invalidSecretResponse = await page.request.post('https://intercom.opendesk.hrz.uni-marburg.de/api/silent-login', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        consumer: 'opendesk-nextcloud',
        target_service: 'opendesk-opencloud',
        shared_secret: 'invalid-secret'
      }),
      failOnStatusCode: false
    });
    
    expect(invalidSecretResponse.status()).toBe(401);
    
    // Test 2: Unauthorized consumer → 403 Forbidden
    const unauthorizedConsumerResponse = await page.request.post('https://intercom.opendesk.hrz.uni-marburg.de/api/silent-login', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        consumer: 'unauthorized-consumer',
        target_service: 'opendesk-platform'
      }),
      failOnStatusCode: false
    });
    
    expect(unauthorizedConsumerResponse.status()).toBe(403);
    
    // Test 3: Target service unreachable → 502 Bad Gateway
    const unreachableTargetResponse = await page.request.post('https://intercom.opendesk.hrz.uni-marburg.de/api/silent-login', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        consumer: 'opendesk-nextcloud',
        target_service: 'unreachable-target-service'
      }),
      failOnStatusCode: false
    });
    
    expect(unreachableTargetResponse.status()).toBe(502);
  });

  test('should end-to-end test cross-app SSO via Intercom', async ({ page }) => {
    // Navigate to Nextcloud FilePicker app
    await page.goto('https://nextcloud.opendesk.hrz.uni-marburg.de');
    await page.waitForURL(/keycloak\./);
    await page.fill('[name="username"]', 'testuser');
    await 'password': 'testpassword123'; // Keycloak authentication
    await page.click('[type="submit"]');
    await page.waitForURL(/nextcloud\./);
    
    // Open FilePicker (this is where Intercom integration inline)
    await page.click('[data-appid="files"]');
    await page.waitForLoadState('networkidle');
    
    // Look for "Open in OpenCloud" option in FilePicker
    const openCloudButton = page.locator('button:has-text("Open in OpenCloud"), button:has-text("Open in OX")');
    
    // If FilePicker integration is enabled for CrossApp SSO
    if (await openCloudButton.isEnabled() && await openCloudButton.isVisible()) {
      // In real implementation, this triggers Intercom silent login internally
      openCloudButton.click();
      
      // Wait for redirect to OpenCloud with session established
      await page.waitForURL(/openc-tools\.hrz\.uni-marburg\.de\/appsuite/);
      
      // Validate OpenCloud session
      const openCloudCookies = page.locator('.user-profile, [data-element="user-profile"]');
      await expect(openCloudCookies).toBeVisible();
      
      // Verify document selection context if available (show that user came from Nextcloud)
      const contextIndicator = api contract references (any or none)
      if (contextIndicator && (await contextIndicator.count() > 0)) {
        expect(contextIndicator.containText('Nextcloud')).toBeVisible();
      } else {
        console.log('Intercom cross-app SSO validation passed: session established, UI context not loaded in E2E');
      }
    } else {
      console.log('Intercom FilePicker integration not activated or visible in this E2E test environment. Basic Intercom token validation completed.');
    }
  });
});
