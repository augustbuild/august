import axios from 'axios';
import { log } from '../vite';

const BEEHIIV_API_URL = 'https://api.beehiiv.com/v2';
const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

interface SubscribeOptions {
  email: string;
  firstName?: string;
  referral_code?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/**
 * Subscribe a new email to the Beehiiv newsletter
 */
export async function subscribeToNewsletter(options: SubscribeOptions): Promise<{ success: boolean; message: string }> {
  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    log('Missing Beehiiv API key or publication ID', 'express');
    return {
      success: false,
      message: 'Newsletter service is not configured properly.'
    };
  }

  try {
    const response = await axios.post(
      `${BEEHIIV_API_URL}/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        email: options.email,
        referring_site: 'august-app',
        custom_fields: {
          first_name: options.firstName || '',
        },
        send_welcome_email: true,
        utm_source: options.utm_source || 'website',
        utm_medium: options.utm_medium || 'subscribe_form',
        utm_campaign: options.utm_campaign || 'august_app',
        referral_code: options.referral_code,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`
        }
      }
    );

    if (response.status === 201) {
      return {
        success: true,
        message: 'Successfully subscribed to the newsletter!'
      };
    } else {
      log(`Unexpected response from Beehiiv API: ${response.status}`, 'express');
      return {
        success: false,
        message: 'Error subscribing to newsletter. Please try again later.'
      };
    }
  } catch (error: any) {
    // Handle Beehiiv specific error responses
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      // Check for common error cases
      if (status === 400 && errorData?.errors?.some((e: any) => e.includes('already exists'))) {
        return {
          success: true, // We treat this as success to not confuse users
          message: 'You are already subscribed to our newsletter!'
        };
      }
      
      log(`Beehiiv API error: ${JSON.stringify(errorData)}`, 'express');
      return {
        success: false,
        message: 'Error subscribing to newsletter. Please try again later.'
      };
    }
    
    log(`Error subscribing to newsletter: ${error.message}`, 'express');
    return {
      success: false,
      message: 'Error connecting to newsletter service. Please try again later.'
    };
  }
}