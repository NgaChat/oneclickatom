import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import { ref, set, get } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import { database } from '../config/firebase';

// ======================
// Constants & Configuration
// ======================
const DB_CONFIG = {
  name: 'SimData.db',
  location: 'default',
  version: '1.3'
};

const API_CONFIG = {
  baseUrl: 'https://store.atom.com.mm/mytmapi',
  version: '4.11',
  endpoints: {
    refreshToken: '/v3/my/oauth/refresh-token',
    dashboard: '/v1/my/dashboard?isFirstTime=1',
    pointDashboard: '/v1/my/point-system/dashboard',
    balance: '/v1/my/lightweight-balance',
    claimList: '/v1/my/point-system/claim-list',
    claim: '/v1/my/point-system/claim'
  }
};

const USER_AGENT = 'MyTM/4.11.1/Android/35';
const DEFAULT_PAGE_SIZE = 10;

// ======================
// Database Initialization
// ======================
const db = SQLite.openDatabase(
  DB_CONFIG,
  () => console.log('Database connection established'),
  error => console.error('Database opening error:', error)
);

export const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Create SimData table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS SimData (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          data TEXT NOT NULL,
          last_updated TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        [],
        () => console.log('SimData table verified'),
        (_, error) => {
          console.error('SimData table error:', error);
          reject(error);
        }
      );

      // Create SoldSimInventory table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS SoldSimInventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          data TEXT NOT NULL,
          sold_at TEXT NOT NULL
        )`,
        [],
        () => {
          console.log('SoldSimInventory table verified');
          createDatabaseIndexes().then(resolve).catch(reject);
        },
        (_, error) => {
          console.error('SoldSimInventory table error:', error);
          reject(error);
        }
      );
    });
  });
};

const createDatabaseIndexes = async () => {
  try {
    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'CREATE INDEX IF NOT EXISTS idx_simdata_user_id ON SimData(user_id)',
          [],
          () => {
            console.log('Index on SimData(user_id) created');
            resolve();
          },
          (_, error) => {
            console.error('Index creation error:', error);
            reject(error);
          }
        );
      });
    });

    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'CREATE INDEX IF NOT EXISTS idx_sold_inventory_sold_at ON SoldSimInventory(sold_at)',
          [],
          () => {
            console.log('Index on SoldSimInventory(sold_at) created');
            resolve();
          },
          (_, error) => {
            console.error('Index creation error:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Database index creation failed:', error);
    throw error;
  }
};

// ======================
// Utility Functions
// ======================
export const getCommonHeaders = async (token = null) => {
  try {
    const deviceName = await DeviceInfo.getDeviceName() || DeviceInfo.getModel();
    const today = new Date().toUTCString();

    return {
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': USER_AGENT,
      'Device-Name': deviceName,
      'If-Modified-Since': today,
      Host: 'store.atom.com.mm',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  } catch (error) {
    console.error('Header generation error:', error);
    throw error;
  }
};

export const getBasicHeaders = async () => {
  return getCommonHeaders(); // Reuse common headers without auth token
};

// ======================
// Authentication Functions
// ======================
export const refreshAccessToken = async (item, forceRefresh = false) => {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;
  let retryCount = 0;

  const attemptRefresh = async () => {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const FIVE_MINUTES = 300;

      if (!forceRefresh && item.access_token_expire_at - currentTime > FIVE_MINUTES) {
        console.log('Access token is still valid, no refresh needed');
        return item;
      }

      const headers = await getBasicHeaders();

      console.log(item);
      const response = await axios.post(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.refreshToken}`,
        { refresh_token: item.refresh_token },
        {
          params: {
            msisdn: item.msisdn,
            userid: item.user_id,
            v: API_CONFIG.version
          },
          headers,
          timeout: 10000
        }
      );

      const attributes = response.data?.data?.attribute;
      if (!attributes) {
        throw new Error('Invalid refresh token response');
      }

      return {
        ...item,
        token: attributes.token,
        access_token_expire_at: attributes.access_token_expire_at,
        ...(attributes.refresh_token ? {
          refresh_token: attributes.refresh_token,
          refresh_token_expire_at: attributes.refresh_token_expire_at,
          
        } : {}),
        hasError: false,
        errorMessage: null,
        errorLabel: null
      };
    } catch (error) {
      retryCount++;
      const errorMsg = error.response?.data?.errors?.message || error.message;
      console.error('Token refresh error:', { error: errorMsg, retryCount });

      if (retryCount < MAX_RETRIES && !errorMsg.includes('Invalid refresh token')) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptRefresh();
      }

     
      return {
        ...item,
        hasError: true,
        errorMessage: errorMsg.includes('Invalid refresh token') 
          ? 'Session expired - please log in again.' 
          : 'Token refresh failed',
        errorLabel: errorMsg.includes('Invalid refresh token') 
          ? 'SESSION_EXPIRED' 
          : 'REFRESH_FAILED'
      };
    }
  };

  return attemptRefresh();
};

export const getUser = async () => {
  try {
    const storedUser = await AsyncStorage.getItem('user');
    if (!storedUser) throw new Error('No user found in storage');
    
    const user = JSON.parse(storedUser);
    if (!user?.id) throw new Error('Invalid user data format');
    
    return user;
  } catch (error) {
    console.error('User retrieval error:', error);
    throw error;
  }
};

export const checkDeviceId = async (navigation) => {
  try {
    const localDeviceId = await DeviceInfo.getUniqueId();
    const user = await getUser();

    // Check local storage first
    if (user.deviceId && user.deviceId !== localDeviceId) {
      throw new Error('Device ID mismatch (local)');
    }

    // Verify with Firebase
    const deviceIdRef = ref(database, `users/${user.id}/deviceId`);
    const snapshot = await get(deviceIdRef);

    if (!snapshot.exists()) throw new Error('Device not registered');
    if (snapshot.val() !== localDeviceId) throw new Error('Device ID mismatch (server)');

    return true;
  } catch (error) {
    console.error('Device verification failed:', error.message);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
    return false;
  }
};

// ======================
// SIM Data Operations
// ======================
export const saveLocalSimData = async (item) => {
 
  if (!item?.user_id) throw new Error('Invalid item - missing user_id');

  try {
    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT OR REPLACE INTO SimData (user_id, data) VALUES (?, ?)',
          [item.user_id, JSON.stringify(item)],
          (_, result) => result.rowsAffected > 0 ? resolve() : reject(new Error('No rows affected')),
          (_, error) => reject(error)
        );
      });
    });
    return true;
  } catch (error) {
    console.error('Local save error:', { error: error.message, itemId: item.user_id });
    throw error;
  }
};

export const getLocalSimData = async (page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const offset = (page - 1) * pageSize;

  try {
    return await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT data FROM SimData 
           ORDER BY json_extract(data, '$.totalPoint') DESC 
           LIMIT ? OFFSET ?`,
          [pageSize, offset],
          (_, result) => {
            const items = Array.from({ length: result.rows.length }, (_, i) => 
              JSON.parse(result.rows.item(i).data)
            );
            resolve(items);
          },
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Local data retrieval error:', { error: error.message, page, pageSize });
    throw error;
  }
};

export const getAllLocalSimData = async () => {
  try {
    return await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT data FROM SimData ORDER BY json_extract(data, "$.totalPoint") DESC',
          [],
          (_, result) => {
            const items = Array.from({ length: result.rows.length }, (_, i) => 
              JSON.parse(result.rows.item(i).data)
            );
            resolve(items);
          },
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Local data retrieval error:', error);
    throw error;
  }
};

export const deleteSimData = async (userId) => {
  try {
    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM SimData WHERE user_id = ?',
          [userId],
          (_, result) => result.rowsAffected > 0 ? resolve() : reject(new Error('No records deleted')),
          (_, error) => reject(error)
        );
      });
    });
    return true;
  } catch (error) {
    console.error('Local delete error:', { error: error.message, userId });
    throw error;
  }
};

export const deleteAllSqlData = async () => {
  try {
    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM SimData',
          [],
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
    return true;
  } catch (error) {
    console.error('Local data deletion error:', error);
    throw error;
  }
};

// ======================
// Firebase Operations
// ======================
export const saveFirebaseSimData = async (item) => {
  try {
    const user = await getUser();
    const itemRef = ref(database, `users/${user.id}/data/${item.user_id}`);
    await set(itemRef, item);
    return true;
  } catch (error) {
    console.error('Firebase save error:', { error: error.message, itemId: item?.user_id });
    throw error;
  }
};

export const getFirebaseSimData = async () => {
  try {
    const user = await getUser();
    const dataRef = ref(database, `users/${user.id}/data`);
    const snapshot = await get(dataRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Firebase data retrieval error:', error);
    throw error;
  }
};

export const deleteFirebaseSimItem = async (userId) => {
  try {
    const user = await getUser();
    const itemRef = ref(database, `users/${user.id}/data/${userId}`);
    await set(itemRef, null);
    await deleteAdminDataItem(userId); // Delete from Firebase admin data
    return true;
  } catch (error) {
    console.error('Firebase delete error:', { error: error.message, userId });
    throw error;
  }
};

export const getAccountLimit = async () => {
  try {
    const user = await getUser();
    const limitRef = ref(database, `users/${user.id}/limitAccount`);
    const snapshot = await get(limitRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Account limit retrieval error:', error);
    throw error;
  }
};

// ======================
// Sold Inventory Operations
// ======================
export const addToSoldInventory = async (item) => {
  if (!item?.user_id) throw new Error('Invalid item - missing user_id');

  try {
    const soldItem = {
      ...item,
      inventory_status: 'sold',
      sold_at: new Date().toISOString()
    };

    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT OR REPLACE INTO SoldSimInventory (user_id, data, sold_at) VALUES (?, ?, ?)',
          [soldItem.user_id, JSON.stringify(soldItem), soldItem.sold_at],
          (_, result) => result.rowsAffected > 0 ? resolve() : reject(new Error('No rows affected')),
          (_, error) => reject(error)
        );
      });
    });
    return true;
  } catch (error) {
    console.error('Sold inventory update error:', { error: error.message, itemId: item.user_id });
    throw error;
  }
};

export const getSoldSims = async (page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const offset = (page - 1) * pageSize;

  try {
    return await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT data FROM SoldSimInventory 
           ORDER BY sold_at DESC 
           LIMIT ? OFFSET ?`,
          [pageSize, offset],
          (_, result) => {
            const items = Array.from({ length: result.rows.length }, (_, i) => 
              JSON.parse(result.rows.item(i).data)
            );
            resolve(items);
          },
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Sold items retrieval error:', { error: error.message, page, pageSize });
    throw error;
  }
};

export const getAllSoldSims = async () => {
  try {
    return await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT data FROM SoldSimInventory ORDER BY sold_at DESC',
          [],
          (_, result) => {
            const items = Array.from({ length: result.rows.length }, (_, i) => 
              JSON.parse(result.rows.item(i).data)
            );
            resolve(items);
          },
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Sold items retrieval error:', error);
    throw error;
  }
};

export const deleteFromSoldInventory = async (userId) => {
  try {
    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM SoldSimInventory WHERE user_id = ?',
          [userId],
          (_, result) => result.rowsAffected > 0 ? resolve() : reject(new Error('No records deleted')),
          (_, error) => reject(error)
        );
      });
    });
    return true;
  } catch (error) {
    console.error('Sold inventory deletion error:', { error: error.message, userId });
    throw error;
  }
};

export const saveFirebaseSoldSim = async (item) => {
  try {
    const user = await getUser();
    const soldSimRef = ref(database, `users/${user.id}/sold_sims/${item.user_id}`);
    await set(soldSimRef, item);
    return true;
  } catch (error) {
    console.error('Firebase sold SIM save error:', { error: error.message, itemId: item?.user_id });
    throw error;
  }
};

export const getFirebaseSoldSims = async () => {
  try {
    const user = await getUser();
    const soldSimsRef = ref(database, `users/${user.id}/sold_sims`);
    const snapshot = await get(soldSimsRef);
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error('Firebase sold SIMs retrieval error:', error);
    throw error;
  }
};

export const searchSoldSims = async (searchTerm) => {
  try {
    return await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT data FROM SoldSimInventory WHERE data LIKE ? ORDER BY sold_at DESC',
          [`%${searchTerm}%`],
          (_, result) => {
            const items = Array.from({ length: result.rows.length }, (_, i) => 
              JSON.parse(result.rows.item(i).data)
            );
            resolve(items);
          },
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Sold items search error:', { error: error.message, searchTerm });
    throw error;
  }
};

// ======================
// SIM Management
// ======================
export const markSimAsSold = async (simItem, saleDetails = {}) => {
  try {
    const soldItem = {
      ...simItem,
      sale_details: {
        sale_date: new Date().toISOString(),
        sale_price: saleDetails.price || 0,
        buyer_info: saleDetails.buyer || 'Unknown',
        ...saleDetails
      },
      inventory_status: 'sold',
      sold_at: new Date().toISOString()
    };

    await Promise.all([
      addToSoldInventory(soldItem),
      saveFirebaseSoldSim(soldItem),
      deleteSimData(simItem.user_id),
      deleteFirebaseSimItem(simItem.user_id)
    ]);

    return true;
  } catch (error) {
    console.error('SIM sale processing error:', { error: error.message, itemId: simItem?.user_id });
    throw error;
  }
};

// ======================
// Admin Operations
// ======================
export const getAllAdminData = async () => {
  try {
    const adminDataRef = ref(database, 'admin/data');
    const snapshot = await get(adminDataRef);

    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    return Array.isArray(data) ? data : Object.values(data);
  } catch (error) {
    console.error('Admin data retrieval error:', error);
    throw error;
  }
};

export const saveFirebaseAdminData = async (item) => {
  try {
    // Sanitize the item by removing undefined values
    const sanitizedItem = JSON.parse(JSON.stringify(item));
    
    
    const adminDataRef = ref(database, 'admin/data');
    const snapshot = await get(adminDataRef);

    let data = {};
    if (snapshot.exists()) {
      const existingData = snapshot.val();
      data = Array.isArray(existingData) 
        ? existingData.reduce((acc, val) => ({ ...acc, [val.user_id]: val }), {})
        : existingData;
    }

    data[sanitizedItem.user_id] = sanitizedItem;
    await set(adminDataRef, data);

    return true;
  } catch (error) {
    console.error('Admin data update error:', { 
      error: error.message, 
      itemId: item?.user_id,
      itemData: item // Log the problematic item for debugging
    });
    throw error;
  }
};

// ======================
// Admin Data Deletion
// ======================


// Helper function to delete from Firebase admin data
const deleteAdminDataItem = async (userId) => {
  try {
    const adminDataRef = ref(database, 'admin/data');
    const snapshot = await get(adminDataRef);

    if (!snapshot.exists()) {
      console.log('No admin data found in Firebase');
      return true;
    }

    const currentData = snapshot.val();
    let updatedData;

    if (Array.isArray(currentData)) {
      // If data is stored as array
      updatedData = currentData.filter(item => item.user_id !== userId);
    } else if (typeof currentData === 'object') {
      // If data is stored as object
      updatedData = { ...currentData };
      delete updatedData[userId];
    } else {
      throw new Error('Invalid admin data format in Firebase');
    }

    await set(adminDataRef, updatedData);
    console.log(`Admin data for user ${userId} deleted from Firebase`);
    return true;
  } catch (error) {
    console.error(`Error deleting admin data from Firebase for user ${userId}:`, error);
    throw error;
  }
};

// ======================
// User Data Update Function
// ======================
/**
 * Updates a specific user data item in both Firebase and local SQLite database
 * @param {string} userId - The ID of the user whose data collection will be updated
 * @param {object} item - The complete data object to update (must contain user_id field)
 * @returns {Promise<boolean>} - Returns true if update was successful
 * @throws {Error} - Throws error if update fails
 */
import { getDatabase } from 'firebase/database';


export const updateToUser = async (item) => {
  // Minimal validation - just check if item exists
  if (!item || typeof item !== 'object') {
    throw new Error('Input must be an object');
  }

  // Get IDs without type checking
  const userId = item.userId;
  const itemId = item.user_id || item.id;

  // Only check if IDs exist (not their types)
  if (!userId) throw new Error('Missing userId');
  if (!itemId) throw new Error('Missing item identifier');

  try {
    const db = getDatabase();
    const itemRef = ref(db, `users/${userId}/data/${itemId}`);
    
    // Directly set the data (Firebase will handle type conversion)
    await set(itemRef, item);
    
    
    console.log(`Item ${itemId} saved for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Save operation failed:', {
      userId,
      itemId,
      error: error.message
    });
    throw new Error(`Save failed: ${error.message}`);
  }
};

export const getCombineData = async () => {
  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return [];

    const usersData = snapshot.val();
    let combined = [];

    Object.keys(usersData).forEach(userId => {
      const user = usersData[userId];
      const rawData = user.data;
      let dataArr = [];

      if (Array.isArray(rawData)) {
        dataArr = rawData;
      } else if (rawData && typeof rawData === 'object') {
        dataArr = Object.values(rawData);
      }

      // userId ကို data item တစ်ခုချင်းစီထဲထပ်ထည့်ပေး
      const withUserId = dataArr.map(item => ({
        ...item,
        userId
      }));

      combined = combined.concat(withUserId);
    });

    return combined;
  } catch (error) {
    console.error('getCombineData error:', error);
    throw error;
  }
};