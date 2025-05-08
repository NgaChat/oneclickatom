import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import { database } from '../config/firebase';
import { ref, set, get, onValue } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';

// Open or create the SQLite database
const db = SQLite.openDatabase({ name: 'SimData.db', location: 'default' });

// Initialize the database table
export const initializeDatabase = () => {
  db.transaction((tx) => {
    tx.executeSql(
      'CREATE TABLE IF NOT EXISTS SimData (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT UNIQUE, data TEXT)',
      [],
      () => console.log('SimData table created successfully'),
      (error) => console.error('Error creating SimData table:', error)
    );

    tx.executeSql(
      'CREATE TABLE IF NOT EXISTS SoldSimInventory (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT UNIQUE, data TEXT, sold_at TEXT)',
      [],
      () => {
        console.log('SoldSimInventory table ready');
        resolve();
      },
      (error) => {
        console.error('SoldSimInventory table error:', error);
        reject(error);
      }
    );
  });

  
};

// Common headers generator
export const getCommonHeaders = async (token) => {
  const userAgent = 'MyTM/4.11.1/Android/35';
  const deviceName = await DeviceInfo.getDeviceName() || DeviceInfo.getModel();
  const today = new Date().toUTCString();

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json; charset=UTF-8',
    Connection: 'Keep-Alive',
    'Accept-Encoding': 'gzip',
    'X-Server-Select': 'production',
    'User-Agent': userAgent,
    'Device-Name': deviceName,
    'If-Modified-Since': today,
    Host: 'store.atom.com.mm'
  };
};

export const refreshAccessToken = async (item, forceRefresh = false) => {
  try {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const fiveMinutesInSeconds = 5 * 60; // 5 minutes

    console.log(`[${item.msisdn}] Checking token expiry...`);

    // Skip refresh if not forced and token is still valid
    if (!forceRefresh && item.access_token_expire_at - currentTimeInSeconds > fiveMinutesInSeconds) {
      console.log(`[${item.msisdn}] Token still valid (expires in more than 5 minutes)`);
      return item;
    }

    console.log(`[${item.msisdn}] Refreshing token...`);

    const headers = await getCommonHeaders(item.access_token);
    const response = await axios.post(
      'https://store.atom.com.mm/mytmapi/v3/my/oauth/refresh-token',
      { refresh_token: item.refresh_token },
      {
        params: {
          msisdn: item.msisdn,
          userid: item.user_id,
          v: '4.11'
        },
        headers,
      }
    );

    const attributes = response.data?.data?.attribute;
    if (!attributes) {
      throw new Error('Invalid refresh token response');
    }

    console.log(`[${item.msisdn}] Token refresh successful`);

    // Overwrite only if new refresh_token is provided
    const updatedItem = {
      ...item,
      ...attributes,
      hasError: false, // Reset error flag if refresh was successful
      errorMessage: null, // Clear error message
      errorLabel: null // Clear error label
    };

    if (attributes.refresh_token) {
      updatedItem.refresh_token = attributes.refresh_token;
      updatedItem.refresh_token_expire_at = attributes.refresh_token_expire_at;
    }

    return updatedItem;

  } catch (error) {
    const errorMsg = error.response?.data?.errors?.message || error.message;
    console.error(`[${item.msisdn}] Refresh token failed: ${errorMsg}`);

    if (errorMsg === "Invalid refresh token") {
      console.error(`[${item.msisdn}] Invalid refresh token detected — consider forcing logout or account cleanup`);
      // Add error information to the item for UI display
      return {
        ...item,
        hasError: true,
        errorMessage: 'Session expired — please log in again.',
        errorLabel: 'SESSION_EXPIRED' // This label can be used in UI to show specific styling/message
      };
    }

    // For other errors, you might want to add different labels
    return {
      ...item,
      hasError: true,
      errorMessage: 'Token refresh failed',
      errorLabel: 'REFRESH_FAILED'
    };
  }
};


export const getBasicHeaders = async () => {
  const userAgent = 'MyTM/4.11.1/Android/35';
  const deviceName = await DeviceInfo.getDeviceName() || DeviceInfo.getModel();
  const today = new Date().toUTCString();

  return {
    'Content-Type': 'application/json; charset=UTF-8',
    Connection: 'Keep-Alive',
    'Accept-Encoding': 'gzip',
    'X-Server-Select': 'production',
    'User-Agent': userAgent,
    'Device-Name': deviceName,
    'If-Modified-Since': today,
    Host: 'store.atom.com.mm'
  };
};


export const getUser = async () => {
  try {
    const storedUser = await AsyncStorage.getItem('user');
    if (storedUser) {
      return JSON.parse(storedUser);
    } else {
      console.error('No user found in AsyncStorage');
      return null;
    }
  } catch (error) {
    console.error('Error getting user from AsyncStorage:', error);
    return null;
  }
}

export const saveFirebaseSimData = async (item) => {
  try {
    const storedUser = await AsyncStorage.getItem('user');
    if (!storedUser) {
      console.error('No user found in AsyncStorage');
      return;
    }

    const user = JSON.parse(storedUser);
    const userId = user.id; // Assuming the user ID is stored in the user object

    // Reference to the user's data in Firebase
    const dataRef = ref(database, `users/${userId}/data`);
    const snapshot = await get(dataRef);

    let dataArray = [];

    if (snapshot.exists()) {
      const currentData = snapshot.val();

      // Check if currentData is an array or object
      if (Array.isArray(currentData)) {
        dataArray = [...currentData];
      } else if (typeof currentData === 'object') {
        dataArray = Object.values(currentData); // Convert object to array
      }
    }

    // Check if the item already exists in the array
    const existingIndex = dataArray.findIndex((dataItem) => dataItem.user_id === item.user_id);

    if (existingIndex !== -1) {
      // Update the existing item
      dataArray[existingIndex] = item;
      console.log(`Updated existing item in Firebase with user_id: ${item.user_id}`);
    } else {
      // Add the new item
      dataArray.push(item);
      console.log(`Added new item to Firebase with user_id: ${item.user_id}`);
    }

    // Save the updated array back to Firebase
    await set(dataRef, dataArray);
    console.log('SIM data updated successfully in Firebase');
  } catch (error) {
    console.error('Error updating SIM data in Firebase:', error);
  }
};

export const getFirebaseSimData = async () => {
  try {
    // Get the current user from AsyncStorage
    const storedUser = await AsyncStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (!user || !user.id) {
      console.error('User not found or missing user ID');
      return null;
    }

    // Reference to the user's data in Firebase
    const dataRef = ref(database, `users/${user.id}/data`);
    const snapshot = await get(dataRef);


    if (snapshot.exists()) {
      return snapshot.val(); // Return the data if it exists
    } else {
      console.log('No SIM data found for user');
      return null;
    }
  } catch (error) {
    console.error('Error fetching SIM data:', error);
    throw error; // Rethrow the error for the caller to handle
  }
};

export const deleteFirebaseSimItem = async (id) => {
  try {
    // 1. Get current user
    const user = await getUser();

    if (!user || !user.id) {
      console.error('User not found or missing user ID');
      return { success: false, message: 'User not found' };
    }

    // 2. Get current SIM data from Firebase
    const dataRef = ref(database, `users/${user.id}/data`);
    const snapshot = await get(dataRef);

    if (!snapshot.exists()) {
      console.error('No SIM data found for user');
      return { success: false, message: 'No SIM data found' };
    }

    const currentData = snapshot.val();

    // 3. Check if data is an array (handle both array and object formats)
    let dataArray = [];
    if (Array.isArray(currentData)) {
      dataArray = [...currentData];
    } else if (typeof currentData === 'object') {
      // Convert object to array if needed
      dataArray = Object.values(currentData);
    }

    // 4. Find the item by id
    const itemIndex = dataArray.findIndex((item) => item.user_id === id);
    if (itemIndex === -1) {
      console.error('Item with the given ID not found');
      return { success: false, message: 'Item not found' };
    }

    // 5. Remove item from array
    dataArray.splice(itemIndex, 1);

    // 6. Update data in Firebase
    await set(dataRef, dataArray);

    console.log(`Successfully deleted item with ID ${id}`);
    return {
      success: true,
      message: 'Item deleted successfully',
      newData: dataArray // Return updated array
    };

  } catch (error) {
    console.error('Error deleting SIM item:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete item',
      error: error
    };
  }
};



// Save SIM data to SQLite
export const saveLocalSimData = async (item) => {
  try {
    if (!item) {
      console.warn('No item provided to save');
      return;
    }

    const dataString = JSON.stringify(item);

    db.transaction((tx) => {
      tx.executeSql(
        'INSERT OR REPLACE INTO SimData (user_id, data) VALUES (?, ?)',
        [item.user_id, dataString],
        () => console.log(`SIM data saved for user_id: ${item.user_id}`),
        (error) => console.error('Error saving SIM data to SQLite:', error)
      );
    });
  } catch (error) {
    console.error('Error saving SIM data to SQLite:', error);
  }
};

// Get paginated SIM data from SQLite
export const getLocalSimData = async (page = 1, pageSize = 5) => {
  return new Promise((resolve, reject) => {
    const offset = (page - 1) * pageSize;

    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM SimData LIMIT ? OFFSET ?`,
        [pageSize, offset],
        (tx, results) => {
          const rows = results.rows;
          const data = [];

          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            const parsedData = JSON.parse(row.data); // Parse JSON data
            data.push(parsedData);
          }

          // Sort data by totalPoint in descending order
          data.sort((a, b) => (b.totalPoint || 0) - (a.totalPoint || 0));

          console.log(`Retrieved SIM data from SQLite (Page: ${page}):`, data.length);
          resolve(data);
        },
        (error) => {
          console.error('Error fetching paginated SIM data from SQLite:', error);
          reject([]);
        }
      );
    });
  });
};

// Get all SIM data from SQLite
export const getAllLocalSimData = async () => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM SimData', // Remove json_extract and fetch all data
        [],
        (tx, results) => {
          const rows = results.rows;
          const data = [];

          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            const parsedData = JSON.parse(row.data); // Parse JSON data
            data.push(parsedData);
          }

          // Sort data by totalPoint in descending order
          data.sort((a, b) => (b.totalPoint || 0) - (a.totalPoint || 0));

          console.log('Retrieved all SIM data from SQLite (Ordered by totalPoint):', data.length);
          resolve(data);
        },
        (error) => {
          console.error('Error fetching all SIM data from SQLite:', error);
          reject([]);
        }
      );
    });
  });
};

// Delete SIM data by user_id
export const deleteSimData = async (user_id) => {
  try {
    await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'DELETE FROM SimData WHERE user_id = ?',
          [user_id],
          (tx, results) => {
            if (results.rowsAffected > 0) {
              console.log(`Successfully deleted SIM data for user_id: ${user_id}`);
              resolve(results);
            } else {
              console.log(`No SIM data found for user_id: ${user_id}`);
              reject(new Error('No records found to delete'));
            }
          },
          (tx, error) => {
            console.error('Database error:', error);
            reject(error);
          }
        );
      });
    });
    return true; // Deletion successful
  } catch (error) {
    console.error('Failed to delete SIM data:', error);
    throw error; // Re-throw for caller to handle
  }
};

// Delete all SIM data from SQLite
export const deleteAllSqlData = async () => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'DELETE FROM SimData', // SQL query to delete all rows
        [],
        () => {
          console.log('All SIM data deleted successfully from SQLite');
          resolve(true); // Resolve the promise on success
        },
        (error) => {
          console.error('Error deleting all SIM data from SQLite:', error);
          reject(error); // Reject the promise on error
        }
      );
    });
  });
};

export const getAccountLimit = async () => {
  try {
    // Get the current user from AsyncStorage
    const storedUser = await AsyncStorage.getItem('user');
    if (!storedUser) {
      console.error('No user found in AsyncStorage');
      return null; // Return null if no user is found
    }

    const user = JSON.parse(storedUser);
    const userId = user.id; // Assuming the user ID is stored in the user object

    if (!userId) {
      console.error('User ID is missing');
      return null; // Return null if user ID is missing
    }

    // Reference to the user's limitNumber in Firebase
    const limitRef = ref(database, `users/${userId}/limitAccount`);
    const snapshot = await get(limitRef);

    if (snapshot.exists()) {
      const limitNumber = snapshot.val(); // Get the value of limitNumber
      console.log(`Limit number for user_id ${userId}:`, limitNumber);
      return limitNumber; // Return the limitNumber
    } else {
      console.warn(`No limitNumber found for user_id ${userId}`);
      return null; // Return null if limitNumber does not exist
    }
  } catch (error) {
    console.error('Error fetching account limit from Firebase:', error);
    throw error; // Rethrow the error for the caller to handle
  }
};

export const checkDeviceId = async (navigation) => {
  try {
    // Get the current device ID from DeviceInfo
    const localDeviceId = await DeviceInfo.getUniqueId();
    console.log('Local Device ID:', localDeviceId);

    // Get the current user from AsyncStorage
    const storedUser = await AsyncStorage.getItem('user');
    if (!storedUser) {
      console.error('No user found in AsyncStorage');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }], // Redirect to Login screen
      });
      return;
    }


    const user = JSON.parse(storedUser);
    const userId = user.id;

    console.log('User ID:', localDeviceId);

    if (user.deviceId !== localDeviceId) {
      console.warn('Device ID mismatch. Redirecting to Login screen.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }], // Redirect to Login screen
      });
      return;
    }

    if (!userId) {
      console.error('User ID is missing');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }], // Redirect to Login screen
      });
      return;
    }

    // Reference to the user's deviceId in Firebase
    const deviceIdRef = ref(database, `users/${userId}/deviceId`);
    const snapshot = await get(deviceIdRef);

    if (snapshot.exists()) {
      const firebaseDeviceId = snapshot.val(); // Get the deviceId from Firebase
      console.log(`Device ID from Firebase: ${firebaseDeviceId}`);

      if (firebaseDeviceId !== localDeviceId) {
        console.warn('Device ID mismatch. Redirecting to Login screen.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }], // Redirect to Login screen
        });
      } else {
        console.log('Device ID matches. Access granted.');
      }
    } else {
      console.warn('No deviceId found in Firebase. Redirecting to Login screen.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }], // Redirect to Login screen
      });
    }
  } catch (error) {
    console.error('Error checking device ID:', error);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }], // Redirect to Login screen on error
    });
  }
};





export const addToSoldInventory = async (item) => {
  try {
    if (!item || !item.user_id) {
      console.warn('Invalid item or missing user_id');
      return false;
    }

    // Add sold metadata to the item
    const soldItem = {
      ...item,
      inventory_status: 'sold',
      sold_at: new Date().toISOString()
    };

    const dataString = JSON.stringify(soldItem);
    const soldAt = soldItem.sold_at; // Get the timestamp

    await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'INSERT OR REPLACE INTO SoldSimInventory (user_id, data, sold_at) VALUES (?, ?, ?)',
          [soldItem.user_id, dataString, soldAt], // Include sold_at in the query
          () => {
            console.log(`SIM marked as sold: ${soldItem.user_id}`);
            resolve(true);
          },
          (error) => {
            console.error('Error adding to sold inventory:', error);
            reject(error);
          }
        );
      });
    });

    return true;
  } catch (error) {
    console.error('Failed to add to sold inventory:', error);
    return false;
  }
};

export const getSoldSims = async (page = 1, pageSize = 10) => {
  return new Promise((resolve, reject) => {
    const offset = (page - 1) * pageSize;

    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM SoldSimInventory ORDER BY sold_at DESC LIMIT ? OFFSET ?`,
        [pageSize, offset],
        (tx, results) => {
          const data = [];
          for (let i = 0; i < results.rows.length; i++) {
            const row = results.rows.item(i);
            const itemData = JSON.parse(row.data);
            // Ensure we have the correct sold_at value
            itemData.sold_at = row.sold_at || itemData.sold_at;
            data.push(itemData);
          }
          resolve(data);
        },
        (error) => {
          console.error('Error fetching sold SIMs:', error);
          reject(error);
        }
      );
    });
  });
};

export const getAllSoldSims = async () => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM SoldSimInventory ORDER BY sold_at DESC',
        [],
        (tx, results) => {
          const data = [];
          for (let i = 0; i < results.rows.length; i++) {
            const row = results.rows.item(i);
            const itemData = JSON.parse(row.data);
            // Ensure we have the correct sold_at value
            itemData.sold_at = row.sold_at || itemData.sold_at;
            data.push(itemData);
          }
          resolve(data);
        },
        (error) => {
          console.error('Error fetching all sold SIMs:', error);
          reject(error);
        }
      );
    });
  });
};

export const deleteFromSoldInventory = async (user_id) => {
  try {
    await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'DELETE FROM SoldSimInventory WHERE user_id = ?',
          [user_id],
          (tx, results) => {
            if (results.rowsAffected > 0) {
              console.log(`Deleted sold SIM: ${user_id}`);
              resolve(true);
            } else {
              reject(new Error('No record found'));
            }
          },
          (tx, error) => {
            console.error('Error deleting from sold inventory:', error);
            reject(error);
          }
        );
      });
    });
    return true;
  } catch (error) {
    console.error('Failed to delete from sold inventory:', error);
    return false;
  }
};

export const saveFirebaseSoldSim = async (item) => {
  try {
    const user = await getUser();
    if (!user?.id) throw new Error('User not found');

    const soldSimRef = ref(database, `users/${user.id}/sold_sims/${item.user_id}`);
    await set(soldSimRef, item);
    console.log('Sold SIM saved to Firebase:', item.user_id);
    return true;
  } catch (error) {
    console.error('Error saving sold SIM to Firebase:', error);
    return false;
  }
};

export const getFirebaseSoldSims = async () => {
  try {
    const user = await getUser();
    if (!user?.id) throw new Error('User not found');

    const soldSimsRef = ref(database, `users/${user.id}/sold_sims`);
    const snapshot = await get(soldSimsRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  } catch (error) {
    console.error('Error fetching sold SIMs from Firebase:', error);
    throw error;
  }
};

export const markSimAsSold = async (simItem, saleDetails = {}) => {
  try {
    // Add sale details to the item
    const soldItem = {
      ...simItem,
      sale_details: {
        sale_date: new Date().toISOString(),
        sale_price: saleDetails.price || 0,
        buyer_info: saleDetails.buyer || 'Unknown',
        ...saleDetails
      },
      inventory_status: 'sold',
      sold_at: new Date().toISOString() // Explicitly set sold_at
    };

    // Add to sold inventory
    await addToSoldInventory(soldItem);
    await saveFirebaseSoldSim(soldItem);

    // Remove from active inventory
    // await deleteSimData(simItem.user_id);
    // await deleteFirebaseSimItem(simItem.user_id);

    console.log(`Successfully marked SIM ${simItem.user_id} as sold`);
    return true;
  } catch (error) {
    console.error('Error marking SIM as sold:', error);
    return false;
  }
};

export const searchSoldSims = async (searchTerm) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM SoldSimInventory WHERE data LIKE ? ORDER BY sold_at DESC`,
        [`%${searchTerm}%`],
        (tx, results) => {
          const data = [];
          for (let i = 0; i < results.rows.length; i++) {
            const row = results.rows.item(i);
            const itemData = JSON.parse(row.data);
            // Ensure we have the correct sold_at value
            itemData.sold_at = row.sold_at || itemData.sold_at;
            data.push(itemData);
          }
          resolve(data);
        },
        (error) => {
          console.error('Error searching sold SIMs:', error);
          reject(error);
        }
      );
    });
  });
};