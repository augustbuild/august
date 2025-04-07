/**
 * Script to bulk subscribe all August users with email addresses to the newsletter
 * Breaking into batches to avoid timeouts
 */
import axios from 'axios';

// Configuration
const BATCH_SIZE = 5; // Number of users to process in each batch
const BATCH_DELAY_MS = 2000; // Delay between batches in milliseconds

async function subscribeAllUsers() {
  try {
    console.log('Starting bulk newsletter subscription process...');
    
    // Use the current host to make the request instead of hardcoding localhost
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    console.log(`Using base URL: ${baseUrl}`);
    
    console.log('Attempting to use batch processing method first...');
    
    try {
      // First, get all users with email addresses
      const usersResponse = await axios.get(`${baseUrl}/api/admin/users/with-email`, {
        params: {
          _devBypassAuth: true,
          _scriptRunToken: "august_newsletter_script_2025"
        }
      });
      
      const users = usersResponse.data.users;
      console.log(`Found ${users.length} users with email addresses`);
      
      // Process users in batches
      const totalBatches = Math.ceil(users.length / BATCH_SIZE);
      console.log(`Processing in ${totalBatches} batches of ${BATCH_SIZE} users each`);
      
      // Result tracking
      const results = {
        total: users.length,
        processed: 0,
        success: 0,
        alreadySubscribed: 0,
        failed: 0,
        errors: []
      };
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, users.length);
        const batchUsers = users.slice(start, end);
        
        console.log(`\nProcessing batch ${batchIndex + 1}/${totalBatches} (users ${start + 1}-${end})...`);
        
        // Subscribe each user in the batch
        for (const user of batchUsers) {
          try {
            const response = await axios.post(`${baseUrl}/api/admin/newsletter/subscribe-single`, {
              userId: user.id,
              _devBypassAuth: true,
              _scriptRunToken: "august_newsletter_script_2025"
            });
            
            results.processed++;
            
            if (response.data.success) {
              if (response.data.message.includes('already subscribed')) {
                results.alreadySubscribed++;
                console.log(`✓ User ${user.id} (${user.email || user.username}): Already subscribed`);
              } else {
                results.success++;
                console.log(`✓ User ${user.id} (${user.email || user.username}): Subscribed successfully`);
              }
            } else {
              results.failed++;
              const errorMsg = `✗ User ${user.id} (${user.email || user.username}): ${response.data.message}`;
              console.log(errorMsg);
              results.errors.push(errorMsg);
            }
          } catch (error) {
            results.failed++;
            results.processed++;
            const errorMsg = `✗ User ${user.id} (${user.email || user.username}): ${error.message}`;
            console.log(errorMsg);
            results.errors.push(errorMsg);
          }
          
          // Add a small delay between users to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Add delay between batches
        if (batchIndex < totalBatches - 1) {
          console.log(`Waiting ${BATCH_DELAY_MS/1000} seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }
      
      // Print final results
      console.log('\nSubscription process completed:');
      console.log('----------------------------------------');
      console.log(`Total users: ${results.total}`);
      console.log(`Processed: ${results.processed}`);
      console.log(`Successfully subscribed: ${results.success}`);
      console.log(`Already subscribed: ${results.alreadySubscribed}`);
      console.log(`Failed to subscribe: ${results.failed}`);
      
      if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.forEach((error) => {
          console.log(`- ${error}`);
        });
      }
      
      console.log('\nProcess complete!');
      
    } catch (error) {
      console.log('Error with batch processing:', error.message);
      console.log('Falling back to legacy bulk subscription process...');
      
      // Fall back to the legacy bulk endpoint
      try {
        const response = await axios.post(`${baseUrl}/api/admin/newsletter/bulk-subscribe`, {
          _devBypassAuth: true,
          _scriptRunToken: "august_newsletter_script_2025"
        }, {
          timeout: 600000 // 10 minutes in milliseconds
        });
        
        console.log('Subscription process completed successfully (legacy method):');
        console.log('----------------------------------------');
        console.log(`Total users processed: ${response.data.results.total}`);
        console.log(`Successfully subscribed: ${response.data.results.success}`);
        console.log(`Already subscribed: ${response.data.results.alreadySubscribed}`);
        console.log(`Failed to subscribe: ${response.data.results.failed}`);
        
        if (response.data.results.errors.length > 0) {
          console.log('\nErrors:');
          response.data.results.errors.forEach((error) => {
            console.log(`- ${error}`);
          });
        }
        
        console.log('\nProcess complete!');
      } catch (legacyError) {
        console.error('Legacy bulk subscription failed as well:');
        if (legacyError.response) {
          console.error('Response data:', legacyError.response.data);
          console.error('Status:', legacyError.response.status);
        } else if (legacyError.request) {
          console.error('No response received. Request timeout or network issue.');
        } else {
          console.error('Error message:', legacyError.message);
        }
        throw new Error('Both new and legacy subscription methods failed');
      }
    }
    
  } catch (error) {
    console.error('Error executing bulk subscription:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
    } else if (error.request) {
      console.error('No response received. Request timeout or network issue.');
    } else {
      console.error('Error message:', error.message);
    }
  }
}

// Execute the function
subscribeAllUsers();